<?php

namespace Mautic\LeadBundle\Services;

use Mautic\LeadBundle\Entity\Lead;

/**
 * Aggregates multiple strategies to provide tag suggestions for a contact.
 */
class TagSuggestionService
{
    /**
     * @param iterable<TagSuggestionStrategyInterface> $strategies
     */
    public function __construct(private iterable $strategies = [])
    {
    }

    /**
     * @return string[]
     */
    public function suggestTags(Lead $lead): array
    {
        $suggestions = [];
        foreach ($this->strategies as $strategy) {
            $suggestions = array_merge($suggestions, $strategy->suggestTags($lead));
        }

        return array_values(array_unique($suggestions));
    }

    public function addStrategy(TagSuggestionStrategyInterface $strategy): void
    {
        $this->strategies[] = $strategy;
    }
}
