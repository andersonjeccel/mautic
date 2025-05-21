<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Provider;

use Mautic\LeadBundle\Event\LeadListFiltersOperatorsEvent;
use Mautic\LeadBundle\LeadEvents;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

final class FilterOperatorProvider implements FilterOperatorProviderInterface
{
    /**
     * @var mixed[]
     */
    private array $cachedOperators = [];

    public function __construct(
        private EventDispatcherInterface $dispatcher,
        private TranslatorInterface $translator,
    ) {
    }

    /**
     * @return mixed[]
     */
    public function getAllOperators(): array
    {
        if (empty($this->cachedOperators)) {
            $event = new LeadListFiltersOperatorsEvent([], $this->translator);

            $this->dispatcher->dispatch($event, LeadEvents::LIST_FILTERS_OPERATORS_ON_GENERATE);

            $this->cachedOperators = $this->translateOperatorLabels($event->getOperators());
        }

        return $this->cachedOperators;
    }

    /**
     * Get operators with date-specific labels for date fields
     *
     * @return mixed[]
     */
    public function getOperatorsForDateField(): array
    {
        $operators = $this->getAllOperators();
        $dateOperators = $operators;

        // Replace labels with date-specific versions for certain operators
        $dateSpecificOperators = [
            '>' => 'mautic.core.operator.date.greaterthan',
            '>=' => 'mautic.core.operator.date.greaterthanequals',
            '<' => 'mautic.core.operator.date.lessthan',
            '<=' => 'mautic.core.operator.date.lessthanequals',
            'between' => 'mautic.core.operator.date.between',
            '!between' => 'mautic.core.operator.date.notbetween',
        ];

        foreach ($dateSpecificOperators as $operator => $translationKey) {
            if (isset($dateOperators[$operator])) {
                $dateOperators[$operator]['label'] = $this->translator->trans($translationKey);
            }
        }

        return $dateOperators;
    }

    /**
     * @param mixed[] $operators
     *
     * @return mixed[]
     */
    private function translateOperatorLabels(array $operators): array
    {
        foreach ($operators as $key => $operatorSettings) {
            $operators[$key]['label'] = $this->translator->trans($operatorSettings['label']);
        }

        return $operators;
    }
}
