<?php

namespace MauticPlugin\MailgunWebhookSupportBundle\Callback;

use Symfony\Component\HttpFoundation\Request;

class ResponseItems implements \Iterator
{
    /** @var array<int, ResponseItem> */
    private array $items  = [];
    private int $position = 0;

    public function __construct(Request $request)
    {
        $this->parseRequest($request);
    }

    public function current(): ResponseItem
    {
        return $this->items[$this->position];
    }

    public function next(): void
    {
        ++$this->position;
    }

    public function key(): int
    {
        return $this->position;
    }

    public function valid(): bool
    {
        return isset($this->items[$this->position]);
    }

    public function rewind(): void
    {
        $this->position = 0;
    }

    private function parseRequest(Request $request): void
    {
        // Get JSON data from request body
        $content = $request->getContent();
        if (empty($content)) {
            return;
        }

        $data = json_decode($content, true);
        if (!is_array($data)) {
            return;
        }

        // Real Mailgun format: check for event-data
        if (isset($data['event-data']) && is_array($data['event-data'])) {
            $eventData = $data['event-data'];
            
            if (isset($eventData['event']) && isset($eventData['recipient'])) {
                if (CallbackEnum::shouldBeEventProcessed($eventData['event'], $eventData)) {
                    $this->items[] = new ResponseItem($eventData);
                }
            }
        }
    }
}
