<?php

declare(strict_types=1);

namespace Mautic\PageBundle\Model;

use Mautic\CategoryBundle\Entity\Category;
use Mautic\CoreBundle\Security\Permissions\CorePermissions;
use Mautic\PageBundle\Entity\Page;

final readonly class PageActionModel
{
    public function __construct(private PageModel $pageModel, private CorePermissions $permissions)
    {
    }

    /** @param array<int> $pageIds @return array<Page> */
    public function setCategory(array $pageIds, Category $category): array
    {
        $pages = $this->pageModel->getRepository()->findBy(['id' => $pageIds]);
        $affected = [];
        foreach ($pages as $page) {
            if ($this->permissions->hasEntityAccess('page:pages:editown', 'page:pages:editother', $page->getCreatedBy())) {
                $page->setCategory($category);
                $affected[] = $page;
            }
        }
        if ($affected) {
            $this->pageModel->saveEntities($affected);
        }

        return $affected;
    }
}
