<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Segment;

use Symfony\Contracts\Translation\TranslatorInterface;

/**
 * Service to provide date-specific translations for operators when used with date fields.
 */
class DateOperatorTranslationService
{
    /**
     * @var array<string, string>
     */
    private array $dateFieldTypes = [
        'date'     => 'date',
        'datetime' => 'date',
        'time'     => 'date',
    ];

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
     * @var array<string, string>
     */
    private array $standardOperatorMap = [
        OperatorOptions::GREATER_THAN          => 'mautic.lead.list.form.operator.greaterthan',
        OperatorOptions::GREATER_THAN_OR_EQUAL => 'mautic.lead.list.form.operator.greaterthanequals',
        OperatorOptions::LESS_THAN             => 'mautic.lead.list.form.operator.lessthan',
        OperatorOptions::LESS_THAN_OR_EQUAL    => 'mautic.lead.list.form.operator.lessthanequals',
        OperatorOptions::BETWEEN               => 'mautic.lead.list.form.operator.between',
        OperatorOptions::NOT_BETWEEN           => 'mautic.lead.list.form.operator.notbetween',
    ];

    public function __construct(
        private TranslatorInterface $translator
    ) {
    }

    /**
     * Translate operator labels for a specific field type.
     *
     * @param array<string, string> $operators The operators array
     * @param string                $fieldType The field type
     *
     * @return array<string, string> The translated operators array
     */
    public function translateOperators(array $operators, string $fieldType): array
    {
        if (!$this->isDateField($fieldType)) {
            return $operators;
        }

        $translatedOperators = [];

        foreach ($operators as $operatorKey => $operatorLabel) {
            if (isset($this->dateOperatorMap[$operatorKey])) {
                // Use date-specific translation
                $translatedOperators[$operatorKey] = $this->translator->trans($this->dateOperatorMap[$operatorKey]);
            } else {
                // Use standard translation
                $translatedOperators[$operatorKey] = $operatorLabel;
            }
        }

        return $translatedOperators;
    }

    /**
     * Check if a field type is a date field.
     *
     * @param string $fieldType The field type
     *
     * @return bool True if the field is a date field, false otherwise
     */
    private function isDateField(string $fieldType): bool
    {
        return isset($this->dateFieldTypes[$fieldType]);
    }
}
