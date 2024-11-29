<?php

namespace Mautic\LeadBundle\EventListener;

use Mautic\CoreBundle\CoreEvents;
use Mautic\CoreBundle\Event\CustomButtonEvent;
use Mautic\CoreBundle\Security\Permissions\CorePermissions;
use Mautic\CoreBundle\Twig\Helper\ButtonHelper;
use Mautic\LeadBundle\Model\LeadModel;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

class ButtonSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private TranslatorInterface $translator,
        private RouterInterface $router,
        private CorePermissions $security,
        private RequestStack $requestStack,
        private SessionInterface $session,
        private LeadModel $leadModel,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            CoreEvents::VIEW_INJECT_CUSTOM_BUTTONS => ['injectViewButtons', 0],
        ];
    }

    public function injectViewButtons(CustomButtonEvent $event): void
    {
        if (!str_contains($event->getRoute(), 'mautic_contact_index')) {
            return;
        }

        if ($this->security->isAdmin() || $this->security->isGranted('lead:export:enable', 'MATCH_ONE')) {
            $exportRoute = $this->router->generate('mautic_contact_action', ['objectAction' => 'batchExport']);

            $event->addButton(
                [
                    'attr'      => [
                        'data-toggle'           => 'confirmation',
                        'href'                  => $exportRoute.'?filetype=xlsx',
                        'data-precheck'         => 'batchActionPrecheck',
                        'data-message'          => $this->translator->trans(
                            'mautic.core.export.items',
                            ['%items%' => 'contacts']
                        ),
                        'data-confirm-text'     => $this->translator->trans('mautic.core.export.xlsx'),
                        'data-confirm-callback' => 'executeBatchAction',
                        'data-cancel-text'      => $this->translator->trans('mautic.core.form.cancel'),
                        'data-cancel-callback'  => 'dismissConfirmation',
                    ],
                    'btnText'   => $this->translator->trans('mautic.core.export.xlsx'),
                    'iconClass' => 'ri-file-excel-line',
                ],
                ButtonHelper::LOCATION_BULK_ACTIONS
            );

            $event->addButton(
                [
                    'attr'      => [
                        'data-toggle'           => 'confirmation',
                        'href'                  => $exportRoute.'?filetype=csv',
                        'data-precheck'         => 'batchActionPrecheck',
                        'data-message'          => $this->translator->trans(
                            'mautic.core.export.items',
                            ['%items%' => 'contacts']
                        ),
                        'data-confirm-text'     => $this->translator->trans('mautic.core.export.csv'),
                        'data-confirm-callback' => 'executeBatchAction',
                        'data-cancel-text'      => $this->translator->trans('mautic.core.form.cancel'),
                        'data-cancel-callback'  => 'dismissConfirmation',
                    ],
                    'btnText'   => $this->translator->trans('mautic.core.export.csv'),
                    'iconClass' => 'ri-file-text-line',
                ],
                ButtonHelper::LOCATION_TOOLBAR_BULK_ACTIONS
            );

            $event->addButton(
                [
                    'attr'      => [
                        'href'        => $exportRoute.'?filetype=xlsx',
                        'data-toggle' => null,
                    ],
                    'btnText'   => $this->translator->trans('mautic.core.export.xlsx'),
                    'iconClass' => 'ri-file-excel-line',
                ],
                ButtonHelper::LOCATION_PAGE_ACTIONS
            );

            $event->addButton(
                [
                    'attr'      => [
                        'href'        => $exportRoute.'?filetype=csv',
                        'data-toggle' => null,
                    ],
                    'btnText'   => $this->translator->trans('mautic.core.export.csv'),
                    'iconClass' => 'ri-file-text-line',
                ],
                ButtonHelper::LOCATION_PAGE_ACTIONS
            );
        }

        if ($this->security->isGranted(['lead:leads:editown', 'lead:leads:editother'], 'MATCH_ONE')) {
            $event->addButton(
                [
                    'attr' => [
                        'class'       => 'btn btn-ghost btn-sm btn-nospin',
                        'data-toggle' => 'ajaxmodal',
                        'data-target' => '#MauticSharedModal',
                        'href'        => $this->router->generate('mautic_segment_batch_contact_view'),
                        'data-header' => $this->translator->trans('mautic.lead.batch.lists'),
                    ],
                    'btnText'   => $this->translator->trans('mautic.lead.batch.lists'),
                    'iconClass' => 'ri-pie-chart-line',
                ],
                ButtonHelper::LOCATION_BULK_ACTIONS
            );

            $event->addButton(
                [
                    'attr' => [
                        'class'       => 'btn btn-ghost btn-sm btn-nospin',
                        'data-toggle' => 'ajaxmodal',
                        'data-target' => '#MauticSharedModal',
                        'href'        => $this->router->generate('mautic_contact_action', ['objectAction' => 'batchStages']),
                        'data-header' => $this->translator->trans('mautic.lead.batch.stages'),
                    ],
                    'btnText'   => $this->translator->trans('mautic.lead.batch.stages'),
                    'iconClass' => 'ri-barricade-line flip-vertically',
                ],
                ButtonHelper::LOCATION_BULK_ACTIONS
            );

            $event->addButton(
                [
                    'attr' => [
                        'class'       => 'btn btn-ghost btn-sm btn-nospin',
                        'data-toggle' => 'ajaxmodal',
                        'data-target' => '#MauticSharedModal',
                        'href'        => $this->router->generate('mautic_tagmanager_batch_index_action'),
                        'data-header' => $this->translator->trans('mautic.tagmanager.batch.tags'),
                    ],
                    'btnText'   => $this->translator->trans('mautic.tagmanager.batch.tags'),
                    'iconClass' => 'ri-hashtag',
                ],
                ButtonHelper::LOCATION_BULK_ACTIONS
            );

            $event->addButton(
                [
                    'attr' => [
                        'class'       => 'btn btn-ghost btn-sm btn-nospin',
                        'data-toggle' => 'ajaxmodal',
                        'data-target' => '#MauticSharedModal',
                        'href'        => $this->router->generate('mautic_contact_action', ['objectAction' => 'batchCampaigns']),
                        'data-header' => $this->translator->trans('mautic.lead.batch.campaigns'),
                    ],
                    'btnText'   => $this->translator->trans('mautic.lead.batch.campaigns'),
                    'iconClass' => 'ri-megaphone-line',
                ],
                ButtonHelper::LOCATION_BULK_ACTIONS
            );

            $event->addButton(
                [
                    'attr' => [
                        'class'       => 'btn btn-ghost btn-sm btn-nospin',
                        'data-toggle' => 'ajaxmodal',
                        'data-target' => '#MauticSharedModal',
                        'href'        => $this->router->generate('mautic_contact_action', ['objectAction' => 'batchOwners']),
                        'data-header' => $this->translator->trans('mautic.lead.batch.owner'),
                    ],
                    'btnText'   => $this->translator->trans('mautic.lead.batch.owner'),
                    'iconClass' => 'ri-user-2-line',
                ],
                ButtonHelper::LOCATION_BULK_ACTIONS
            );

            $event->addButton(
                [
                    'attr' => [
                        'class'       => 'btn btn-ghost btn-sm btn-nospin',
                        'data-toggle' => 'ajaxmodal',
                        'data-target' => '#MauticSharedModal',
                        'href'        => $this->router->generate('mautic_contact_action', ['objectAction' => 'batchDnc']),
                        'data-header' => $this->translator->trans('mautic.lead.batch.dnc'),
                    ],
                    'btnText'   => $this->translator->trans('mautic.lead.batch.dnc'),
                    'iconClass' => 'ri-prohibited-line text-danger',
                ],
                ButtonHelper::LOCATION_BULK_ACTIONS
            );
        }

        $event->addButton(
            [
                'attr' => [
                    'class'       => 'hidden-xs btn btn-ghost btn-icon btn-nospin',
                    'size'        => 'lg',
                    'href'        => 'javascript: void(0)',
                    'onclick'     => 'Mautic.toggleLiveLeadListUpdate();',
                    'id'          => 'liveModeButton',
                    'data-toggle' => false,
                    'data-max-id' => $this->leadModel->getRepository()->getMaxLeadId(),
                ],
                'tooltip'   => $this->translator->trans('mautic.lead.lead.live_update'),
                'iconClass' => 'ri-refresh-line',
            ],
            ButtonHelper::LOCATION_TOOLBAR_ACTIONS
        );

        $request          = $this->requestStack->getCurrentRequest();
        $indexMode        = $request->get('view', $this->session->get('mautic.lead.indexmode', 'list'));
        $anonymous        = $this->translator->trans('mautic.lead.lead.searchcommand.isanonymous');
        $search           = $request->get('search', '');
        $anonymousShowing = 'list' === $indexMode
            && str_contains($search, $anonymous)
            && !str_contains($search, '!'.$anonymous);

        if ('list' === $indexMode) {
            $event->addButton(
                [
                    'attr' => [
                        'class'          => 'hidden-xs btn btn-ghost btn-icon btn-nospin'.($anonymousShowing ? ' btn-primary' : ''),
                        'size'           => 'lg',
                        'href'           => 'javascript: void(0)',
                        'onclick'        => 'Mautic.toggleAnonymousLeads();',
                        'id'             => 'anonymousLeadButton',
                        'data-anonymous' => $this->translator->trans('mautic.lead.lead.searchcommand.isanonymous'),
                    ],
                    'tooltip'   => $this->translator->trans('mautic.lead.lead.anonymous_leads'),
                    'iconClass' => 'ri-spy-line',
                ],
                ButtonHelper::LOCATION_TOOLBAR_ACTIONS
            );
        }
    }
}
