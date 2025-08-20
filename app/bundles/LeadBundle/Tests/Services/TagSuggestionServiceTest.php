<?php

namespace Mautic\LeadBundle\Tests\Services;

use Mautic\LeadBundle\Entity\Lead;
use Mautic\LeadBundle\Services\FieldTagSuggestionStrategy;
use Mautic\LeadBundle\Services\TagSuggestionService;
use PHPUnit\Framework\TestCase;

class TagSuggestionServiceTest extends TestCase
{
    public function testSuggestsTags(): void
    {
        $lead = new Lead();
        $lead->setFields([
            'core' => [
                'company' => ['value' => 'Acme', 'type' => 'text'],
                'city'    => ['value' => 'Paris', 'type' => 'text'],
            ],
        ]);

        $service = new TagSuggestionService([new FieldTagSuggestionStrategy()]);
        $tags    = $service->suggestTags($lead);

        $this->assertContains('Acme', $tags);
        $this->assertContains('Paris', $tags);
    }
}
