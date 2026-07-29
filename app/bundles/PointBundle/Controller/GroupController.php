<?php

namespace Mautic\PointBundle\Controller;

use Mautic\CoreBundle\Controller\AbstractStandardFormController;
use Mautic\PointBundle\Model\PointGroupModel;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\Service\Attribute\Required;

final class GroupController extends AbstractStandardFormController
{
    private PointGroupModel $pointGroupModel;

    #[Required]
    public function autowireGroupController(PointGroupModel $pointGroupModel): void
    {
        $this->pointGroupModel = $pointGroupModel;
    }

    protected function getTemplateBase(): string
    {
        return '@MauticPoint/Group';
    }

    protected function getModelName(): string
    {
        return 'point.group';
    }

    /**
     * @param int $page
     */
    public function indexAction(Request $request, $page = 1): Response
    {
        return parent::indexStandard($request, $page);
    }

    /**
     * Generates new form and processes post data.
     *
     * @return JsonResponse|Response
     */
    public function newAction(Request $request)
    {
        return parent::newStandard($request);
    }

    /**
     * Generates edit form and processes post data.
     *
     * @param int  $objectId
     * @param bool $ignorePost
     */
    public function editAction(Request $request, $objectId, $ignorePost = false): Response
    {
        return parent::editStandard($request, $objectId, $ignorePost);
    }

    /**
     * Deletes the entity.
     *
     * @param int $objectId
     *
     * @return JsonResponse|RedirectResponse
     */
    public function deleteAction(Request $request, $objectId)
    {
        return parent::deleteStandard($request, $objectId);
    }

    /**
     * Deletes a group of entities.
     *
     * @return JsonResponse|RedirectResponse
     */
    public function batchDeleteAction(Request $request)
    {
        return parent::batchDeleteStandard($request);
    }

    public function batchPublishAction(Request $request): RedirectResponse
    {
        return $this->batchPublishStatusAction($request, true);
    }

    public function batchUnpublishAction(Request $request): RedirectResponse
    {
        return $this->batchPublishStatusAction($request, false);
    }

    private function batchPublishStatusAction(Request $request, bool $published): RedirectResponse
    {
        $page = $request->getSession()->get('mautic.point.group.page', 1);
        $returnUrl = $this->generateUrl('mautic_point.group_index', ['page' => $page]);
        $affected = 0;

        if (Request::METHOD_POST === $request->getMethod()) {
            $ids = json_decode($request->query->get('ids', '[]'), true);
            foreach (is_array($ids) ? $ids : [] as $objectId) {
                $entity = $this->pointGroupModel->getEntity($objectId);

                if (null === $entity || $entity->isPublished() === $published || !$this->security->hasEntityAccess(
                    'point:groups:editown', 'point:groups:editother', $entity->getCreatedBy()
                )) {
                    continue;
                }

                $entity->setIsPublished($published);
                $this->pointGroupModel->saveEntity($entity);
                ++$affected;
            }
        }

        if ($affected > 0) {
            $this->addFlashMessage($published ? 'mautic.point.group.notice.batch_published' : 'mautic.point.group.notice.batch_unpublished', ['%count%' => $affected]);
        }

        return $this->redirect($returnUrl);
    }
}
