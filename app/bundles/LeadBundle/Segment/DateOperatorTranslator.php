<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Segment;

use Symfony\Contracts\Translation\TranslatorInterface;

/**
 * Class DateOperatorTranslator
 * Translates standard operators to date-specific language when used with date fields.
 */
class DateOperatorTranslator
{
    private TranslatorInterface $translator;

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

    public function __construct(TranslatorInterface $translator)
    {
        $this->translator = $translator;
    }

    /**
     * Translates an operator label for date fields.
     *
     * @param string $operator The operator code
     * @param string $fieldType The field type
     * @param string $defaultLabel The default label to use if no date-specific translation exists
     *
     * @return string The translated operator label
     */
    public function translateOperator(string $operator, string $fieldType, string $defaultLabel): string
    {
        // Check if this is a date-related field type and we have a date-specific translation
        if ($this->isDateField($fieldType) && isset($this->dateOperatorMap[$operator])) {
            return $this->translator->trans($this->dateOperatorMap[$operator]);
        }

        // Fall back to the default label
        return $defaultLabel;
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
        return in_array($fieldType, ['date', 'datetime', 'time'], true);
    }
}
