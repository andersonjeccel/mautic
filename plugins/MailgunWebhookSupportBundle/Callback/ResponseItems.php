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
        $content = $request->getContent();
        if (!is_string($content) || empty($content)) {
            return;
        }

        $data = json_decode($content, true);
        if (!is_array($data)) {
            return;
        }

        // Handle single webhook with event-data structure (actual Mailgun format)
        if (isset($data['event-data'])) {
            $eventData = $data['event-data'];
            if (is_array($eventData) && isset($eventData['event']) && isset($eventData['recipient'])) {
                if (CallbackEnum::shouldBeEventProcessed($eventData['event'], $eventData)) {
                    $this->items[] = new ResponseItem($eventData);
                }
            }

            return;
        }

        // Handle array of events (for testing or batch processing)
        foreach ($data as $item) {
            if (!is_array($item)) {
                continue;
            }

            if (!isset($item['event']) || !isset($item['recipient'])) {
                continue;
            }

            if (!CallbackEnum::shouldBeEventProcessed($item['event'], $item)) {
                continue;
            }

            $this->items[] = new ResponseItem($item);
        }
    }
}
