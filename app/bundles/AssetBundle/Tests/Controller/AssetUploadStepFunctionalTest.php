<?php

declare(strict_types=1);

namespace Mautic\AssetBundle\Tests\Controller;

use Mautic\CoreBundle\Test\MauticMysqlTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class AssetUploadStepFunctionalTest extends MauticMysqlTestCase
{
    protected function setUp(): void
    {
        $this->configParams['allowed_extensions'] = ['png', 'txt'];

        parent::setUp();
    }

    public function testNewAssetPageRendersStepper(): void
    {
        $crawler = $this->client->request(Request::METHOD_GET, '/s/assets/new');

        $this->assertResponseIsSuccessful();
        $this->assertCount(1, $crawler->filter('[data-stepper] form[data-step-submit="details"]'));
        $this->assertCount(0, $crawler->filter('#dropzone'));
    }

    public function testValidFileReturnsDetailsStep(): void
    {
        $crawler = $this->upload($this->createUploadedFile('mautic_logo_db64.png', 'image/png'));

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);
        $this->assertCount(1, $crawler->filter('form[name="asset"]'));
        $this->assertNotSame('', $crawler->filter('#asset_tempName')->attr('value'));
        $this->assertSame('mautic_logo_db64.png', $crawler->filter('#asset_originalFileName')->attr('value'));
        $this->assertSame('mautic_logo_db64.png', $crawler->filter('#asset_title')->attr('value'));
    }

    public function testMimeTypeNotMatchingExtensionIsRejected(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'asset').'.png';
        file_put_contents($path, '<?php echo 1;');

        $crawler = $this->upload(new UploadedFile($path, 'fake.png', 'image/png', null, true));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
        $this->assertCount(1, $crawler->filter('form[data-step-submit="details"] .invalid-feedback'));
    }

    public function testDisallowedExtensionIsRejected(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'asset').'.php';
        file_put_contents($path, 'x');

        $this->upload(new UploadedFile($path, 'a.php', null, null, true));

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testMissingFileIsRejected(): void
    {
        $this->setCsrfHeader();
        $this->client->xmlHttpRequest(Request::METHOD_POST, '/s/assets/upload');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testRemoteChoiceReturnsDetailsStepWithRemoteStorage(): void
    {
        $this->setCsrfHeader();
        $crawler = $this->client->xmlHttpRequest(Request::METHOD_POST, '/s/assets/upload', ['remote' => '1']);

        $this->assertResponseStatusCodeSame(Response::HTTP_OK);
        $this->assertCount(1, $crawler->filter('#asset_remotePath'));
        $this->assertSame('', (string) $crawler->filter('#asset_tempName')->attr('value'));
    }

    public function testUploadRequiresPost(): void
    {
        $this->client->request(Request::METHOD_GET, '/s/assets/upload');

        $this->assertResponseStatusCodeSame(Response::HTTP_METHOD_NOT_ALLOWED);
    }

    private function upload(UploadedFile $file): \Symfony\Component\DomCrawler\Crawler
    {
        $this->setCsrfHeader();

        return $this->client->xmlHttpRequest(Request::METHOD_POST, '/s/assets/upload', [], ['file' => $file]);
    }

    private function createUploadedFile(string $name, string $mime): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'asset').'.png';
        copy(self::getContainer()->getParameter('kernel.project_dir').'/app/assets/images/'.$name, $path);

        return new UploadedFile($path, $name, $mime, null, true);
    }
}
