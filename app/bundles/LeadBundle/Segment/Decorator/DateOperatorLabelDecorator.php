<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Segment\Decorator;

use Mautic\LeadBundle\Segment\OperatorOptions;
use Symfony\Contracts\Translation\TranslatorInterface;

/**
 * Class DateOperatorLabelDecorator
 * Decorates operator labels with date-specific language when used with date fields.
 */
class DateOperatorLabelDecorator
{
    /**
     * @var array<string, string>
     */
    private array $dateOperatorMap = [
        OperatorOptions::GREATER_THAN          => 'mautic.lead.list.form.operator.date.gt',
        OperatorOptions::GREATER_THAN_OR_EQUAL => 'mautic.lead.list.form.operator.date.gte',
        OperatorOptions::LESS_THAN             => 'mautic.lead.list.form.operator.date.lt',
        OperatorOptions::LESS_THAN_OR_EQUAL    => 'mautic.lead.list.form.operator.date.lte',
        OperatorOptions::BETWEEN               => 'mautic.lead.list.form.operator.date.between',
        OperatorOptions::NOT_BETWEEN           => 'mautic.lead.list.form.operator.date.notbetween',
    ];

    /**
     * @var array<string>
     */
    private array $dateFieldTypes = ['date', 'datetime', 'time'];

    public function __construct(
        private TranslatorInterface $translator
    ) {
    }

    /**
     * Decorates operator labels for date fields.
     *
     * @param array<string, string> $operators The operators array with standard labels
     * @param string                $fieldType The field type
     *
     * @return array<string, string> The operators array with date-specific labels where applicable
     */
    public function decorateLabels(array $operators, string $fieldType): array
    {
        // Only apply date-specific labels for date field types
        if (!$this->isDateField($fieldType)) {
            return $operators;
        }

        // Replace standard operator labels with date-specific ones
        foreach ($operators as $operator => $label) {
            if (isset($this->dateOperatorMap[$operator])) {
                $operators[$operator] = $this->translator->trans($this->dateOperatorMap[$operator]);
            }
        }

        return $operators;
    }

    /**
     * Determines if a field type is date-related.
     *
     * @param string $fieldType The field type
     *
     * @return bool True if the field is date-related, false otherwise
     */
    private function isDateField(string $fieldType): bool
    {
        return in_array($fieldType, $this->dateFieldTypes, true);
    }
}
