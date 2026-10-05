"""Build only candidate-owned outputs; Dart Sass runs in the isolated DDEV project."""
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CSS = ROOT / 'app/bundles/CoreBundle/Assets/css'
LOAD = ['--load-path=app/bundles/CoreBundle/Assets/css', '--load-path=vendor/twbs/bootstrap-sass/assets/stylesheets']

def compile_sass(source, target):
    map_flag = '--source-map' if target.name == 'legacy-reference.css' else '--no-source-map'
    subprocess.run(['ddev', 'exec', 'var/dart-sass/sass', map_flag, '--style=expanded', *LOAD, str(source.relative_to(ROOT)), str(target.relative_to(ROOT))], cwd=ROOT, check=True)

if __name__ == '__main__':
    compile_sass(HERE / 'bootstrap5.scss', HERE / 'bootstrap5.css')
    compile_sass(HERE / 'legacy-reference.scss', HERE / 'legacy-reference.css')
    subprocess.run(['node', str(HERE / 'differential.cjs')], cwd=ROOT, check=True)
    compile_sass(HERE / 'app.scss', HERE / 'app.css')
    subprocess.run(['node', str(HERE / 'assets.cjs')], cwd=ROOT, check=True)
