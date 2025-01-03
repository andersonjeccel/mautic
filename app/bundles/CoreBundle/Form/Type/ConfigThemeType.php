<?php

namespace Mautic\CoreBundle\Form\Type;

use Doctrine\ORM\EntityManagerInterface;
use Mautic\AssetBundle\Entity\Asset;
use Mautic\CoreBundle\Form\DataTransformer\ArrayStringTransformer;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * @extends AbstractType<mixed>
 */
class ConfigThemeType extends AbstractType
{
    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    /**
     * Constructor to inject EntityManagerInterface.
     */
    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // Existing company_name field
        $builder->add(
            'brand_name',
            TextType::class,
            [
                'label'      => 'mautic.core.config.form.brand_name',
                'label_attr' => [
                    'class' => 'control-label',
                ],
                'attr'  => [
                    'class'   => 'form-control',
                    'tooltip' => 'mautic.core.config.form.brand_name.tooltip',
                ],
                'required' => false,
                'data'     => $options['data']['brand_name'] ?? '',
            ]
        );

        // Retrieve image assets from the Asset repository
        $imageAssets = $this->getImageAssets();

        // Prepare choices array: 'Asset Title' => asset ID
        $choices = [];
        foreach ($imageAssets as $asset) {
            /** @var Asset $asset */
            $choices[$asset->getTitle()] = $asset->getId();
        }

        // Add logo_white_bg ChoiceType field
        $builder->add(
            'logo_white_bg',
            ChoiceType::class,
            [
                'label'       => 'mautic.core.config.form.logo_white_bg',
                'choices'     => $choices,
                'placeholder' => 'mautic.core.config.form.choose_asset',
                'required'    => false,
                'attr'        => [
                    'class'   => 'form-control',
                    'tooltip' => 'mautic.core.config.form.logo_white_bg.tooltip',
                ],
                'choice_label' => function ($choice, $key, $value) {
                    /** @var Asset $asset */
                    $asset = $this->entityManager->getRepository(Asset::class)->find($value);
                    if ($asset && $asset->isImage()) {
                        return $asset->getTitle(); // Customize if needed, e.g., include thumbnails
                    }

                    return $key;
                },
            ]
        );

        // Add logo_color_bg ChoiceType field
        $builder->add(
            'logo_color_bg',
            ChoiceType::class,
            [
                'label'       => 'mautic.core.config.form.logo_color_bg',
                'choices'     => $choices,
                'placeholder' => 'mautic.core.config.form.choose_asset',
                'required'    => false,
                'attr'        => [
                    'class'   => 'form-control',
                    'tooltip' => 'mautic.core.config.form.logo_color_bg.tooltip',
                ],
                'choice_label' => function ($choice, $key, $value) {
                    /** @var Asset $asset */
                    $asset = $this->entityManager->getRepository(Asset::class)->find($value);
                    if ($asset && $asset->isImage()) {
                        return $asset->getTitle(); // Customize if needed, e.g., include thumbnails
                    }

                    return $key;
                },
            ]
        );

        // Existing primary_brand_color field
        $builder->add(
            'primary_brand_color',
            TextType::class,
            [
                'label'      => 'mautic.core.config.form.primary_brand_color',
                'label_attr' => [
                    'class' => 'control-label',
                ],
                'attr'  => [
                    'class'        => 'form-control minicolors-input',
                    'tooltip'      => 'mautic.core.config.form.primary_brand_color.tooltip',
                    'data-toggle'  => 'color',
                    'autocomplete' => 'false',
                    'size'         => '7',
                ],
                'required' => false,
            ]
        );

        // Existing theme field
        $builder->add(
            'theme',
            ThemeListType::class,
            [
                'label' => 'mautic.core.config.form.theme',
                'attr'  => [
                    'class'   => 'form-control',
                    'tooltip' => 'mautic.core.config.form.theme.tooltip',
                ],
            ]
        );

        // Existing accent field
        $builder->add(
            'accent',
            HiddenType::class,
            [
                'label'      => 'mautic.user.preferences.accent',
                'label_attr' => ['class' => 'control-label'],
                'attr'       => [
                    'class' => 'form-control',
                ],
                'required' => false,
            ]
        );

        // Rounded corners
        $builder->add(
            'rounded_corners',
            HiddenType::class,
            [
                'attr'       => [
                    'class' => 'form-control',
                ],
                'required' => false,
            ]
        );

        // Existing theme_import_allowed_extensions field with ArrayStringTransformer
        $builder->add(
            $builder->create(
                'theme_import_allowed_extensions',
                TextType::class,
                [
                    'label'      => 'mautic.core.config.form.theme.import.allowed.extensions',
                    'label_attr' => [
                        'class' => 'control-label',
                    ],
                    'attr'       => [
                        'class' => 'form-control',
                    ],
                    'required'   => false,
                ]
            )->addViewTransformer(new ArrayStringTransformer())
        );
    }

    /**
     * Retrieve image assets from the Asset repository.
     *
     * @return Asset[]
     */
    private function getImageAssets(): array
    {
        // Fetch all assets that are stored locally
        $assets = $this->entityManager->getRepository(Asset::class)->findBy([
            'storageLocation' => 'local', // Adjust criteria if needed
        ]);

        // Filter assets to include only images using the isImage() method
        $imageAssets = array_filter($assets, function (Asset $asset) {
            return $asset->isImage();
        });

        return $imageAssets;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => null, // Adjust based on your data class
        ]);
    }

    public function getBlockPrefix(): string
    {
        return 'themeconfig';
    }
}
