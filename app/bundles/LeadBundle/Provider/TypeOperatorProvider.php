<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Provider;

use Mautic\LeadBundle\Entity\OperatorListTrait;
use Mautic\LeadBundle\Event\FieldOperatorsEvent;
use Mautic\LeadBundle\Event\TypeOperatorsEvent;
use Mautic\LeadBundle\LeadEvents;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;

final class TypeOperatorProvider implements TypeOperatorProviderInterface
{
    use OperatorListTrait;

    /**
     * @var array<string,mixed[]>
     */
    private array $cachedTypeOperators = [];

    /**
     * @var array<string,mixed[]>
     */
    private array $cachedTypeOperatorsChoices = [];

    public function __construct(
        private EventDispatcherInterface $dispatcher,
        private FilterOperatorProviderInterface $filterOperatorProvider,
    ) {
    }

    public function getOperatorsIncluding(array $operators): array
    {
        return $this->getOperatorChoiceList(['include' => $operators]);
    }

    public function getOperatorsExcluding(array $operators): array
    {
        return $this->getOperatorChoiceList(['exclude' => $operators]);
    }

    public function getOperatorsForFieldType(string $fieldType): array
    {
        // If we already processed this
        if (isset($this->cachedTypeOperatorsChoices[$fieldType])) {
            return $this->cachedTypeOperatorsChoices[$fieldType];
        }

        $typeOperators = $this->getAllTypeOperators();

        if (array_key_exists($fieldType, $typeOperators)) {
            $this->cachedTypeOperatorsChoices[$fieldType] = $this->getOperatorChoiceList($typeOperators[$fieldType]);
        } else {
            $this->cachedTypeOperatorsChoices[$fieldType] = $this->getOperatorChoiceList($typeOperators['default']);
        }

        // Use date-specific operator labels for date fields
        if ($fieldType === 'date' || $fieldType === 'datetime') {
            $this->cachedTypeOperatorsChoices[$fieldType] = $this->getDateOperatorChoiceList($typeOperators[$fieldType] ?? $typeOperators['default']);
        }

        return $this->cachedTypeOperatorsChoices[$fieldType];
    }

    public function getAllTypeOperators(): array
    {
        if (empty($this->cachedTypeOperators)) {
            $event = new TypeOperatorsEvent();

            $this->dispatcher->dispatch($event, LeadEvents::COLLECT_OPERATORS_FOR_FIELD_TYPE);

            $this->cachedTypeOperators = $event->getOperatorsForAllFieldTypes();
        }

        return $this->cachedTypeOperators;
    }

    /**
     * This method will add the default operators for the $type like the getOperatorsForFieldType() method
     * but also allows plugins to add more operators.
     *
     * @return array<string,string>
     */
    public function getOperatorsForField(string $type, string $field): array
    {
        $event = new FieldOperatorsEvent(
            $type,
            $field,
            $this->filterOperatorProvider->getAllOperators(),
            $this->getOperatorsForFieldType($type)
        );

        $this->dispatcher->dispatch($event, LeadEvents::COLLECT_OPERATORS_FOR_FIELD);

        return $event->getOperators();
    }

    /**
     * Overwriting deprecated method from OperatorListTrait.
     *
     * @param string $operator
     *
     * @return array<string,mixed[]>
     */
    public function getFilterExpressionFunctions($operator = null)
    {
        $operatorOptions = $this->filterOperatorProvider->getAllOperators();

        return (null === $operator) ? $operatorOptions : $operatorOptions[$operator];
    }

    /**
     * Get operator choice list with date-specific labels
     *
     * @param mixed[] $definition
     * @param mixed[] $overrideHiddenOperators
     *
     * @return mixed[]
     */
    public function getDateOperatorChoiceList($definition, $overrideHiddenOperators = []): array
    {
        // Get date-specific operators
        $operatorList = $this->filterOperatorProvider->getOperatorsForDateField();
        $dateOperatorChoices = [];
        foreach ($operatorList as $operator => $def) {
            if (empty($def['hide']) || in_array($operator, $overrideHiddenOperators)) {
                $dateOperatorChoices[$operator] = $def['label'];
            }
        }

        $choices = $dateOperatorChoices;
        if (isset($definition['include'])) {
            // Inclusive operators
            $choices = array_intersect_key($choices, array_flip($definition['include']));
        } elseif (isset($definition['exclude'])) {
            // Exclusive operators
            $choices = array_diff_key($choices, array_flip($definition['exclude']));
        }

        return array_flip($choices);
    }
}
