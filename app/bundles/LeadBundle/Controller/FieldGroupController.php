<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Controller;

use Mautic\CoreBundle\Controller\AbstractFormController;
use Mautic\LeadBundle\Entity\LeadFieldGroup;
use Mautic\LeadBundle\Model\LeadFieldGroupModel;
use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class FieldGroupController extends AbstractFormController
{
    public function indexAction(Request $request, LeadFieldGroupModel $model, int $page = 1): Response|JsonResponse|RedirectResponse
    {
        if (!$this->security->isGranted('lead:fields:full')) {
            return $this->accessDenied();
        }

        $session = $request->getSession();

        $this->setListFilters();

        $limit  = $session->get('mautic.leadfieldgroup.limit', $this->coreParametersHelper->get('default_pagelimit'));
        $search = $request->get('search', $session->get('mautic.leadfieldgroup.filter', ''));
        $session->set('mautic.leadfieldgroup.filter', $search);

        $orderBy    = $session->get('mautic.leadfieldgroup.orderby', 'g.order');
        $orderByDir = $session->get('mautic.leadfieldgroup.orderbydir', 'ASC');

        $start = (1 === $page) ? 0 : (($page - 1) * $limit);
        if ($start < 0) {
            $start = 0;
        }

        $items = $model->getEntities([
            'start'      => $start,
            'limit'      => $limit,
            'filter'     => ['string' => $search],
            'orderBy'    => $orderBy,
            'orderByDir' => $orderByDir,
        ]);

        $count = count($items);

        if ($count && $count < ($start + 1)) {
            $lastPage = (ceil($count / $limit)) ?: 1;
            $session->set('mautic.leadfieldgroup.page', $lastPage);
            $returnUrl = $this->generateUrl('mautic_contactfieldgroup_index', ['page' => $lastPage]);

            return $this->postActionRedirect([
                'returnUrl'       => $returnUrl,
                'viewParameters'  => ['page' => $lastPage],
                'contentTemplate' => 'Mautic\LeadBundle\Controller\FieldGroupController::indexAction',
                'passthroughVars' => [
                    'activeLink'    => '#mautic_contactfieldgroup_index',
                    'mauticContent' => 'leadfieldgroup',
                ],
            ]);
        }

        $session->set('mautic.leadfieldgroup.page', $page);

        $tmpl = $request->isXmlHttpRequest() ? $request->get('tmpl', 'index') : 'index';

        return $this->delegateView([
            'viewParameters' => [
                'items'       => $items,
                'searchValue' => $search,
                'permissions' => ['lead:fields:full' => $this->security->isGranted('lead:fields:full')],
                'tmpl'        => $tmpl,
                'totalItems'  => $count,
                'limit'       => $limit,
                'page'        => $page,
            ],
            'contentTemplate' => '@MauticLead/FieldGroup/list.html.twig',
            'passthroughVars' => [
                'activeLink'    => '#mautic_contactfieldgroup_index',
                'route'         => $this->generateUrl('mautic_contactfieldgroup_index', ['page' => $page]),
                'mauticContent' => 'leadfieldgroup',
            ],
        ]);
    }

    public function newAction(Request $request, LeadFieldGroupModel $model, FormFactoryInterface $formFactory): Response|JsonResponse|RedirectResponse
    {
        if (!$this->security->isGranted('lead:fields:full')) {
            return $this->accessDenied();
        }

        $entity    = new LeadFieldGroup();
        $returnUrl = $this->generateUrl('mautic_contactfieldgroup_index');
        $action    = $this->generateUrl('mautic_contactfieldgroup_action', ['objectAction' => 'new']);
        $form      = $model->createForm($entity, $formFactory, $action);

        if ('POST' === $request->getMethod()) {
            $valid = false;
            if (!$cancelled = $this->isFormCancelled($form)) {
                if ($valid = $this->isFormValid($form)) {
                    $model->saveEntity($entity);

                    $this->addFlashMessage(
                        'mautic.core.notice.created',
                        [
                            '%name%'      => $entity->getName(),
                            '%menu_link%' => 'mautic_contactfieldgroup_index',
                            '%url%'       => $this->generateUrl(
                                'mautic_contactfieldgroup_action',
                                ['objectAction' => 'edit', 'objectId' => $entity->getId()]
                            ),
                        ]
                    );
                }
            }

            if ($cancelled || ($valid && $this->getFormButton($form, ['buttons', 'save'])->isClicked())) {
                return $this->postActionRedirect([
                    'returnUrl'       => $returnUrl,
                    'contentTemplate' => 'Mautic\LeadBundle\Controller\FieldGroupController::indexAction',
                    'passthroughVars' => [
                        'activeLink'    => '#mautic_contactfieldgroup_index',
                        'mauticContent' => 'leadfieldgroup',
                    ],
                ]);
            } elseif ($valid) {
                return $this->editAction($request, $model, $formFactory, $entity->getId(), true);
            }
        }

        return $this->delegateView([
            'viewParameters' => [
                'form'   => $form->createView(),
                'entity' => $entity,
            ],
            'contentTemplate' => '@MauticLead/FieldGroup/form.html.twig',
            'passthroughVars' => [
                'activeLink'    => '#mautic_contactfieldgroup_index',
                'route'         => $action,
                'mauticContent' => 'leadfieldgroup',
            ],
        ]);
    }

    public function editAction(Request $request, LeadFieldGroupModel $model, FormFactoryInterface $formFactory, int $objectId, bool $ignorePost = false): Response|JsonResponse|RedirectResponse
    {
        if (!$this->security->isGranted('lead:fields:full')) {
            return $this->accessDenied();
        }

        $entity    = $model->getEntity($objectId);
        $returnUrl = $this->generateUrl('mautic_contactfieldgroup_index');

        $postActionVars = [
            'returnUrl'       => $returnUrl,
            'contentTemplate' => 'Mautic\LeadBundle\Controller\FieldGroupController::indexAction',
            'passthroughVars' => [
                'activeLink'    => '#mautic_contactfieldgroup_index',
                'mauticContent' => 'leadfieldgroup',
            ],
        ];

        if (null === $entity) {
            return $this->postActionRedirect(
                array_merge($postActionVars, [
                    'flashes' => [
                        [
                            'type'    => 'error',
                            'msg'     => 'mautic.lead.field.group.error.notfound',
                            'msgVars' => ['%id%' => $objectId],
                        ],
                    ],
                ])
            );
        } elseif ($model->isLocked($entity)) {
            return $this->isLocked($postActionVars, $entity, 'lead.fieldgroup');
        }

        $action = $this->generateUrl('mautic_contactfieldgroup_action', ['objectAction' => 'edit', 'objectId' => $objectId]);
        $form   = $model->createForm($entity, $formFactory, $action);

        if (!$ignorePost && 'POST' === $request->getMethod()) {
            $valid = false;
            if (!$cancelled = $this->isFormCancelled($form)) {
                if ($valid = $this->isFormValid($form)) {
                    $model->saveEntity($entity, $this->getFormButton($form, ['buttons', 'save'])->isClicked());

                    $this->addFlashMessage(
                        'mautic.core.notice.updated',
                        [
                            '%name%'      => $entity->getName(),
                            '%menu_link%' => 'mautic_contactfieldgroup_index',
                            '%url%'       => $this->generateUrl(
                                'mautic_contactfieldgroup_action',
                                ['objectAction' => 'edit', 'objectId' => $entity->getId()]
                            ),
                        ]
                    );
                }
            } else {
                $model->unlockEntity($entity);
            }

            if ($cancelled || ($valid && $this->getFormButton($form, ['buttons', 'save'])->isClicked())) {
                return $this->postActionRedirect(
                    array_merge($postActionVars, [
                        'viewParameters' => ['objectId' => $entity->getId()],
                    ])
                );
            } elseif ($valid) {
                $action = $this->generateUrl('mautic_contactfieldgroup_action', ['objectAction' => 'edit', 'objectId' => $entity->getId()]);
                $form   = $model->createForm($entity, $formFactory, $action);
            }
        } else {
            $model->lockEntity($entity);
        }

        return $this->delegateView([
            'viewParameters' => [
                'form'   => $form->createView(),
                'entity' => $entity,
            ],
            'contentTemplate' => '@MauticLead/FieldGroup/form.html.twig',
            'passthroughVars' => [
                'activeLink'    => '#mautic_contactfieldgroup_index',
                'route'         => $action,
                'mauticContent' => 'leadfieldgroup',
            ],
        ]);
    }

    public function deleteAction(Request $request, LeadFieldGroupModel $model, int $objectId): Response|JsonResponse|RedirectResponse
    {
        if (!$this->security->isGranted('lead:fields:full')) {
            return $this->accessDenied();
        }

        $returnUrl = $this->generateUrl('mautic_contactfieldgroup_index');
        $flashes   = [];

        $postActionVars = [
            'returnUrl'       => $returnUrl,
            'contentTemplate' => 'Mautic\LeadBundle\Controller\FieldGroupController::indexAction',
            'passthroughVars' => [
                'activeLink'    => '#mautic_contactfieldgroup_index',
                'mauticContent' => 'leadfieldgroup',
            ],
        ];

        if ('POST' === $request->getMethod()) {
            $entity = $model->getEntity($objectId);

            if (null === $entity) {
                $flashes[] = [
                    'type'    => 'error',
                    'msg'     => 'mautic.lead.field.group.error.notfound',
                    'msgVars' => ['%id%' => $objectId],
                ];
            } elseif ($entity->isSystem()) {
                $flashes[] = [
                    'type' => 'error',
                    'msg'  => 'mautic.lead.field.group.error.system',
                ];
            } elseif ($model->isLocked($entity)) {
                return $this->isLocked($postActionVars, $entity, 'lead.fieldgroup');
            } else {
                $model->deleteEntity($entity);
                $flashes[] = [
                    'type'    => 'notice',
                    'msg'     => 'mautic.core.notice.deleted',
                    'msgVars' => [
                        '%name%' => $entity->getName(),
                        '%id%'   => $objectId,
                    ],
                ];
            }
        }

        return $this->postActionRedirect(
            array_merge($postActionVars, ['flashes' => $flashes])
        );
    }
}
