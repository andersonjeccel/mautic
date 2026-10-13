<?php

declare(strict_types=1);

namespace Mautic\CoreBundle\Tests\Unit\Twig;

use Mautic\CoreBundle\Form\Type\ButtonGroupType;
use Mautic\CoreBundle\Twig\Helper\ButtonHelper;
use PHPUnit\Framework\TestCase;
use Symfony\Bridge\Twig\Extension\FormExtension;
use Symfony\Bridge\Twig\Extension\TranslationExtension;
use Symfony\Bridge\Twig\Form\TwigRendererEngine;
use Symfony\Component\DomCrawler\Crawler;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\Form\FormRenderer;
use Symfony\Component\Form\Forms;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Contracts\Translation\TranslatorInterface;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Twig\RuntimeLoader\FactoryRuntimeLoader;
use Twig\TwigFilter;
use Twig\TwigFunction;
use Twig\TwigTest;

final class BootstrapMarkupTest extends TestCase
{
    private Environment $twig;

    protected function setUp(): void
    {
        $loader = new FilesystemLoader(__DIR__.'/../../../Resources/views');
        $loader->addPath(__DIR__.'/../../../Resources/views', 'MauticCore');
        $loader->addPath(dirname((new \ReflectionClass(FormExtension::class))->getFileName(), 2).'/Resources/views/Form');
        $this->twig = new Environment($loader, ['autoescape' => 'html']);
        $this->twig->addExtension(new TranslationExtension());
        $this->twig->addExtension(new FormExtension());
        $this->twig->addFilter(new TwigFilter('purify', static fn (string $value): string => $value));
        $this->twig->addTest(new TwigTest('numeric', is_numeric(...)));
        $this->twig->addTest(new TwigTest('string', is_string(...)));
        $this->twig->addFunction(new TwigFunction('formFieldFormatList', static fn (): string => ''));
        $renderer = new FormRenderer(new TwigRendererEngine(['form_div_layout.html.twig', 'FormTheme/mautic_form_layout.html.twig'], $this->twig));
        $this->twig->addRuntimeLoader(new FactoryRuntimeLoader([FormRenderer::class => static fn (): FormRenderer => $renderer]));
    }

    public function testTabsRenderNativeSelectionAndFadeState(): void
    {
        $html = $this->twig->render('Helper/nav_tabs.html.twig', [
            'tabs' => [
                ['id' => 'first', 'title' => 'first', 'content' => 'first content'],
                ['id' => 'second', 'title' => 'second', 'content' => 'second content'],
            ],
        ]);
        $crawler = new Crawler($html);

        $this->assertCount(2, $crawler->filter('.nav-link[data-bs-toggle="tab"]'));
        $this->assertSame('#first', $crawler->filter('.nav-link.active')->attr('href'));
        $this->assertSame('true', $crawler->filter('.nav-link.active')->attr('aria-selected'));
        $this->assertSame('first', $crawler->filter('.tab-pane.active.show')->attr('id'));
        $this->assertCount(0, $crawler->filter('[data-toggle], .tab-pane.in'));
    }

    public function testButtonGroupUsesSiblingInputsAndLabelsWithoutJavascript(): void
    {
        $form = Forms::createFormFactory()->createNamed('direction', ButtonGroupType::class, 'outgoing', [
            'choices' => ['Incoming' => 'incoming', 'Outgoing' => 'outgoing'],
        ]);
        $html = $this->twig->createTemplate('{{ form_widget(form) }}')->render(['form' => $form->createView()]);
        $crawler = new Crawler($html);

        $this->assertCount(2, $crawler->filter('input.btn-check + label.btn'));
        $this->assertSame('outgoing', $crawler->filter('input.btn-check:checked')->attr('value'));
        $this->assertSame('direction_1', $crawler->filter('input.btn-check:checked + label')->attr('for'));
        $this->assertCount(0, $crawler->filter('[data-toggle="buttons"], label input'));
    }

    public function testDropdownActionsRenderFocusableNativeItems(): void
    {
        $helper = new ButtonHelper($this->twig, $this->createMock(TranslatorInterface::class), $this->createMock(EventDispatcherInterface::class));
        $helper->reset(new Request(), ButtonHelper::LOCATION_LIST_ACTIONS);
        $helper->setGroupType(ButtonHelper::TYPE_DROPDOWN);
        $helper->setWrappingTags('<li>', '</li>');
        $helper->addButtons([
            ['attr' => ['href' => '#action', 'class' => 'btn btn-ghost custom-action'], 'btnText' => 'Action'],
            ['confirm' => ['confirmAction' => '#delete', 'confirmText' => 'Delete', 'message' => 'Confirm', 'btnText' => 'Delete', 'iconClass' => 'ri-delete-bin-line', 'tooltip' => 'Delete "entry"']],
        ]);
        $crawler = new Crawler('<ul class="dropdown-menu">'.$helper->renderButtons().'</ul>');

        $this->assertCount(2, $crawler->filter('.dropdown-menu > li > a.dropdown-item'));
        $this->assertSame('#action', $crawler->filter('.dropdown-item.custom-action')->attr('href'));
        $this->assertCount(0, $crawler->filter('.dropdown-menu .btn'));
        $this->assertCount(1, $crawler->filter('.dropdown-item[data-toggle="confirmation"]'));
        $this->assertSame('Delete "entry"', $crawler->filter('[data-bs-toggle="tooltip"]')->attr('title'));
        $this->assertSame('left', $crawler->filter('[data-bs-toggle="tooltip"]')->attr('data-bs-placement'));
    }

    public function testHeaderHelpItemsUseNativeModalAndKeyboardMarkup(): void
    {
        $crawler = new Crawler($this->twig->render('Menu/quick_help.html.twig'));

        $this->assertCount(3, $crawler->filter('.dropdown-menu > li > a.dropdown-item[href="#"][data-bs-toggle="modal"]'));
        $this->assertCount(0, $crawler->filter('[data-toggle], [data-target]'));
    }

    public function testDisabledButtonGroupRetainsDisabledInputs(): void
    {
        $form = Forms::createFormFactory()->createNamed('direction', ButtonGroupType::class, 'outgoing', [
            'choices' => ['Incoming' => 'incoming', 'Outgoing' => 'outgoing'],
            'disabled' => true,
        ]);
        $html = $this->twig->createTemplate('{{ form_widget(form) }}')->render(['form' => $form->createView()]);

        $this->assertCount(2, (new Crawler($html))->filter('input.btn-check:disabled + label.btn'));
    }
}
