<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Event;

use Symfony\Contracts\EventDispatcher\Event;

/**
 * Event that collects operators for different field types.
 */
final class TypeOperatorsEvent extends Event
{
    /**
     * @var array<string, array<string, array<int, string>>>
     */
    private array $operators = [];

    /**
     * @var string|null
     */
    private ?string $type;

    /**
     * @param string|null $type
     */
    public function __construct($type = null)
    {
        $this->type = $type;
    }

    /**
     * $operators example:
     * [
     *      'include' => ['=' => 'like'],
     *      'exclude' => ['!=' => '!like'],
     * ].
     *
     * @param string                                 $fieldType
     * @param array<string, array<int, string>>|null $operators
     */
    public function setOperatorsForFieldType(string $fieldType, ?array $operators): void
    {
        $this->operators[$fieldType] = $operators;
    }

    /**
     * @return array<string, array<string, array<int, string>>>
     */
    public function getOperatorsForAllFieldTypes(): array
    {
        return $this->operators;
    }

    /**
     * @param string $type
     *
     * @return array<string, array<int, string>>|null
     */
    public function getOperatorsForFieldType(string $type): ?array
    {
        return $this->operators[$type] ?? null;
    }
    
    /**
     * Get the field type for which operators are being collected.
     *
     * @return string|null
     */
    public function getFieldType(): ?string
    {
        return $this->type;
    }
}
