<?php

declare(strict_types=1);

namespace MauticPlugin\MauticMyEmailVerifierBundle\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Log\LoggerInterface;

final class MyEmailVerifierService
{
    private const API_BASE_URL = 'https://client.myemailverifier.com/verifier/validate_single';
    private const TEST_EMAIL   = 'test@example.com';

    public function __construct(
        private LoggerInterface $logger,
        private Client $httpClient,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function validateEmail(string $email, string $apiKey): array
    {
        try {
            $url = sprintf('%s/%s/%s', self::API_BASE_URL, urlencode($email), $apiKey);

            $this->logger->info('MyEmailVerifier: Validating email', [
                'email' => $email,
                'url'   => str_replace($apiKey, '***', $url),
            ]);

            $response = $this->httpClient->get($url, [
                'timeout' => 30,
                'headers' => [
                    'Accept' => 'application/json',
                ],
            ]);

            $statusCode = $response->getStatusCode();
            $body       = $response->getBody()->getContents();

            if (200 !== $statusCode) {
                $this->logger->error('MyEmailVerifier: HTTP error', [
                    'status_code' => $statusCode,
                    'body'        => $body,
                ]);

                return [
                    'success' => false,
                    'error'   => sprintf('HTTP %d: %s', $statusCode, $body),
                ];
            }

            $data = json_decode($body, true);

            if (null === $data) {
                $this->logger->error('MyEmailVerifier: Invalid JSON response', [
                    'body' => $body,
                ]);

                return [
                    'success' => false,
                    'error'   => 'Invalid JSON response from API',
                ];
            }

            if (isset($data['Status']) && 'false' === $data['Status']) {
                $this->logger->error('MyEmailVerifier: API error', [
                    'response' => $data,
                ]);

                return [
                    'success' => false,
                    'error'   => 'API returned error status',
                ];
            }

            $this->logger->info('MyEmailVerifier: Validation successful', [
                'email'    => $email,
                'response' => $data,
            ]);

            return [
                'success' => true,
                'data'    => $data,
            ];
        } catch (GuzzleException $e) {
            $this->logger->error('MyEmailVerifier: Network error', [
                'email'     => $email,
                'exception' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        } catch (\Throwable $e) {
            $this->logger->error('MyEmailVerifier: Unexpected error', [
                'email'     => $email,
                'exception' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function testApiConnectivity(string $apiKey): array
    {
        return $this->validateEmail(self::TEST_EMAIL, $apiKey);
    }

    /**
     * @param array<string, mixed> $validationData
     *
     * @return array<string, mixed>
     */
    public function shouldRejectEmail(array $validationData, bool $rejectCatchAll, bool $rejectGreylisted, bool $rejectUnknown): array
    {
        $status     = strtolower($validationData['Status'] ?? '');
        $catchAll   = filter_var($validationData['catch_all'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
        $greylisted = filter_var($validationData['Greylisted'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

        if ('invalid' === $status) {
            return [
                'reject' => true,
                'reason' => 'Invalid email address',
            ];
        }

        if ('valid' === $status && !$catchAll && !$greylisted) {
            return [
                'reject' => false,
                'reason' => null,
            ];
        }

        if ($catchAll && $rejectCatchAll) {
            return [
                'reject' => true,
                'reason' => 'Catch-all domain detected',
            ];
        }

        if ($greylisted && $rejectGreylisted) {
            return [
                'reject' => true,
                'reason' => 'Greylisted domain',
            ];
        }

        if ('unknown' === $status && $rejectUnknown) {
            return [
                'reject' => true,
                'reason' => 'Unknown validation status',
            ];
        }

        if ('grey-listed' === $status && $rejectGreylisted) {
            return [
                'reject' => true,
                'reason' => 'Greylisted domain',
            ];
        }

        if ('catch all' === $status && $rejectCatchAll) {
            return [
                'reject' => true,
                'reason' => 'Catch-all domain detected',
            ];
        }

        return [
            'reject' => false,
            'reason' => null,
        ];
    }
}
