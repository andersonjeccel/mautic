<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Mautic\ApiBundle\Serializer\Driver\ApiMetadataDriver;
use Mautic\CoreBundle\Doctrine\Mapping\ClassMetadataBuilder;
use Mautic\CoreBundle\Entity\FormEntity;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Mapping\ClassMetadata;

class LeadFieldGroup extends FormEntity
{
    private ?int $id = null;

    private ?string $name = null;

    private ?string $alias = null;

    private ?string $description = null;

    private ?int $order = 0;

    private bool $isSystem = false;

    public function __clone()
    {
        $this->id       = null;
        $this->isSystem = false;

        parent::__clone();
    }

    public static function loadMetadata(ORM\ClassMetadata $metadata): void
    {
        $builder = new ClassMetadataBuilder($metadata);
        $builder->setTable('lead_field_groups')
            ->setCustomRepositoryClass(LeadFieldGroupRepository::class)
            ->addIndex(['alias'], 'lead_field_group_alias');

        $builder->addIdColumns('name', 'description');

        $builder->createField('alias', 'string')
            ->length(50)
            ->build();

        $builder->createField('order', 'integer')
            ->columnName('field_order')
            ->nullable()
            ->build();

        $builder->createField('isSystem', 'boolean')
            ->columnName('is_system')
            ->option('default', false)
            ->build();
    }

    public static function loadValidatorMetadata(ClassMetadata $metadata): void
    {
        $metadata->addPropertyConstraint('name', new Assert\NotBlank([
            'message' => 'mautic.lead.field.group.name.required',
        ]));

        $metadata->addPropertyConstraint('name', new Assert\Length([
            'max'        => 191,
            'maxMessage' => 'mautic.lead.field.group.name.maxlength',
        ]));

        $metadata->addPropertyConstraint('alias', new Assert\NotBlank([
            'message' => 'mautic.lead.field.group.alias.required',
        ]));

        $metadata->addPropertyConstraint('alias', new Assert\Length([
            'max'        => 50,
            'maxMessage' => 'mautic.lead.field.group.alias.maxlength',
        ]));

        $metadata->addPropertyConstraint('alias', new Assert\Regex([
            'pattern' => '/^[a-z][a-z0-9_]*$/',
            'message' => 'mautic.lead.field.group.alias.invalid',
        ]));
    }

    public static function loadApiMetadata(ApiMetadataDriver $metadata): void
    {
        $metadata->setGroupPrefix('leadFieldGroup')
            ->addListProperties([
                'id',
                'name',
                'alias',
                'description',
                'order',
                'isSystem',
            ])
            ->build();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): self
    {
        $this->isChanged('name', $name);
        $this->name = $name;

        return $this;
    }

    public function getAlias(): ?string
    {
        return $this->alias;
    }

    public function setAlias(?string $alias): self
    {
        $this->isChanged('alias', $alias);
        $this->alias = $alias;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->isChanged('description', $description);
        $this->description = $description;

        return $this;
    }

    public function getOrder(): int
    {
        return $this->order;
    }

    public function setOrder(int $order): self
    {
        $this->isChanged('order', $order);
        $this->order = $order;

        return $this;
    }

    public function isSystem(): bool
    {
        return $this->isSystem;
    }

    public function setIsSystem(bool $isSystem): self
    {
        $this->isSystem = $isSystem;

        return $this;
    }
}
