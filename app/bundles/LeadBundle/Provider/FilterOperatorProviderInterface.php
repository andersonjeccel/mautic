<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Provider;

interface FilterOperatorProviderInterface
{
    /**
     * Finds all operators and reutrn them in an array.
     *
     * @return mixed[]
     */
    public function getAllOperators(): array;

    /**
     * Get operators with date-specific labels for date fields
     *
     * @return mixed[]
     */
    public function getOperatorsForDateField(): array;
}
