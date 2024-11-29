<?php

namespace Mautic\CodingStandards\PhpCSFixer;

use PhpCsFixer\AbstractFixer;
use PhpCsFixer\Config;
use PhpCsFixer\Finder;
use PhpCsFixer\FixerDefinition\CodeSample;
use PhpCsFixer\FixerDefinition\FixerDefinition;
use PhpCsFixer\FixerDefinition\FixerDefinitionInterface;
use PhpCsFixer\StdinFileInfo;
use PhpCsFixer\Tokenizer\Tokens;

class NoTablePrefixDefinitionInTestsFixer extends AbstractFixer
{
    public function getName(): string
    {
        return sprintf('Mautic/%s', parent::getName());
    }

    protected function applyFix(\SplFileInfo $file, Tokens $tokens): void
    {
        $matches = $tokens->findSequence([[T_STRING, 'define'], '(', [T_CONSTANT_ENCAPSED_STRING, "'MAUTIC_TABLE_PREFIX'"]]);

        if ($matches) {
            $begin_defined = $tokens->getPrevTokenOfKind(array_key_first($matches), [[T_STRING, 'defined']]);
            $begin_if      = $tokens->getPrevTokenOfKind($begin_defined, [[T_IF, 'if']]);
            if ($begin_defined) {
                if ((int) $begin_if >= $begin_defined - 4) {
                    $begin     = $begin_if;
                    $end_token = ['}'];
                } else {
                    $begin     = $begin_defined;
                    $end_token = [';'];
                }

                $end = $tokens->getNextTokenOfKind(array_key_last($matches), $end_token);

                foreach (range($begin, $end) as $id) {
                    $tokens->clearAt($id);
                }
                $tokens->removeLeadingWhitespace($end);
            }
        }
    }

    public function isCandidate(Tokens $tokens): bool
    {
        return $tokens->isTokenKindFound(T_CONSTANT_ENCAPSED_STRING);
    }

    public function getDefinition(): FixerDefinitionInterface
    {
        return new FixerDefinition(
            'Test should not define the MAUTIC_TABLE_PREFIX const.',
            [new CodeSample("<?php

class ExampleTest {
    public function setUp(): void
    {
        defined('MAUTIC_TABLE_PREFIX') or define('MAUTIC_TABLE_PREFIX', '');
    }
}
"),
                new CodeSample("<?php

class ExampleTest {
    public function setUp(): void
    {
        if (!defined('MAUTIC_TABLE_PREFIX')) {
            define('MAUTIC_TABLE_PREFIX', '');
        }
    }
}
"), ]
        );
    }

    public function supports(\SplFileInfo $file): bool
    {
        return $file instanceof StdinFileInfo || preg_match('/\/Tests\/.*Test\.php$/', $file->getPathname());
    }

    public function getPriority(): int
    {
        return 1;
    }
}

// Configuration setup
$finder = Finder::create()
    ->in(__DIR__.'/app/bundles')
    ->exclude('CoreBundle/Tests/_support/_generated')
    ->in(__DIR__.'/app/config')
    ->in(__DIR__.'/app/middlewares')
    ->in(__DIR__.'/app/migrations')
    ->in(__DIR__.'/plugins')
    ->in(__DIR__.'/.github/workflows/mautic-asset-upload')
    ->append([__DIR__.'/rector.php', __DIR__.'/rector-older-symfony.php', __DIR__.'/.php-cs-fixer.php', __DIR__.'/ecs.php']);

return (new Config())
    ->setRules([
        '@Symfony'               => true,
        'binary_operator_spaces' => [
            'operators' => [
                '=>' => 'align',
                '='  => 'align',
            ],
        ],
        'phpdoc_to_comment' => false,
        'ordered_imports'   => true,
        'array_syntax'      => [
            'syntax' => 'short',
        ],
        'no_unused_imports'     => true,
        'no_alternative_syntax' => false,
        'header_comment'        => [
            'header' => '',
        ],
        'Mautic/no_table_prefix_definition_in_tests'       => true,
        'multiline_whitespace_before_semicolons'           => true,
        'nullable_type_declaration_for_default_null_value' => false,
        'no_superfluous_phpdoc_tags'                       => [
            'allow_mixed' => true,
        ],
    ])
    ->registerCustomFixers([new NoTablePrefixDefinitionInTestsFixer()])
    ->setFinder($finder);
