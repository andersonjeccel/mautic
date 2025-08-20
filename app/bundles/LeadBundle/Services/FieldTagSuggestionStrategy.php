<?php

namespace Mautic\LeadBundle\Services;

use Mautic\LeadBundle\Entity\Lead;

/**
 * Suggest tags based on simple field values such as company, city or country.
 */
class FieldTagSuggestionStrategy implements TagSuggestionStrategyInterface
{
    /**
     * {@inheritdoc}
     */
    public function suggestTags(Lead $lead): array
    {
        $candidates = [];
        foreach (['company', 'city', 'country'] as $field) {
            $value = $lead->getFieldValue($field);
            if (is_string($value) && '' !== $value) {
                $candidates[] = $value;
            }
        }

        return array_values(array_unique($candidates));
    }
}
