<?php

namespace Mautic\LeadBundle\Services;

use Mautic\LeadBundle\Entity\Lead;

/**
 * Implement to provide tag suggestions for a contact.
 */
interface TagSuggestionStrategyInterface
{
    /**
     * @return string[] list of suggested tag names
     */
    public function suggestTags(Lead $lead): array;
}
