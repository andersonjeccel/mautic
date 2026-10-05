import json
import pathlib
import unittest

HERE = pathlib.Path(__file__).resolve().parent

class CandidateContract(unittest.TestCase):
    def test_single_global_bootstrap5_bundle(self):
        self.assertTrue((HERE / 'app.css').exists(), 'built single-CSS candidate missing')
        css = (HERE / 'app.css').read_text()
        self.assertIn('--bs-body-font-family', css)
        self.assertIn('.btn-ghost', css)
        self.assertNotIn('@import ', css)

if __name__ == '__main__':
    unittest.main()
