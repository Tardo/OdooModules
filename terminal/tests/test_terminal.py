# Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.tests import HttpCase


class TestTerminal(HttpCase):

    def test_terminal(self):
        """Test backend tests."""
        self.phantom_js(
            "/web/tests?module=terminal",
            "",
            login="admin",
        )
