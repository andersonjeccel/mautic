<?php

declare(strict_types=1);

namespace Mautic\PageBundle\Controller;

use Mautic\CategoryBundle\Entity\Category;
use Mautic\CategoryBundle\Model\CategoryModel;
use Mautic\CoreBundle\Controller\AbstractFormController;
use Mautic\PageBundle\Entity\Page;
use Mautic\PageBundle\Form\Type\BatchCategoryType;
use Mautic\PageBundle\Model\PageActionModel;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class BatchPageController extends AbstractFormController
{
    public function indexAction(): Response
    {
        $route = $this->generateUrl('mautic_page_batch_categories_set');

        return $this->delegateView(['viewParameters' => ['form' => $this->createForm(BatchCategoryType::class, [], ['action' => $route])->createView()], 'contentTemplate' => '@MauticPage/Batch/form.html.twig', 'passthroughVars' => ['activeLink' => '#mautic_page_index', 'mauticContent' => 'pageBatch', 'route' => $route]]);
    }

    public function execAction(Request $request, PageActionModel $actionModel, CategoryModel $categoryModel): JsonResponse
    {
        $params = $request->request->all('page_batch');
        $ids = json_decode($params['ids'] ?? '[]');
        $category = $categoryModel->getEntity($params['newCategory'] ?? 0);
        $affected = $ids && $category instanceof Category ? $actionModel->setCategory($ids, $category) : [];
        $this->addFlashMessage('mautic.page.batch_pages_affected', ['%count%' => count($affected)]);

        return new JsonResponse(['closeModal' => true, 'flashes' => $this->getFlashContent(), 'affected' => array_map(static fn (Page $page): int => $page->getId(), $affected)]);
    }
}
