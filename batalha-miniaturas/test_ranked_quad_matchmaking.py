"""Regras de pareamento de quatro participantes, sem alterar partidas 1x1."""
import unittest
from ranked_quad_matchmaking import (
    WaitingPlayer, choose_group, rating_window, bot_slots,
)


class QuadMatchmakingTests(unittest.TestCase):
    def setUp(self):
        self.now = 1000.0

    def player(self, ident, rating=100, wait=0):
        return WaitingPlayer(ident, rating, self.now-wait)

    def test_four_players_near_rating_match_without_bots(self):
        plan=choose_group([
            self.player("a",100,5), self.player("b",105,4),
            self.player("c",98,3), self.player("d",112,2),
        ],self.now)
        self.assertEqual(len(plan.players),4)
        self.assertEqual(len(plan.bots),0)

    def test_initial_window_rejects_far_rating(self):
        plan=choose_group([
            self.player("a",100,5),self.player("b",900,5),
            self.player("c",910,5),self.player("d",920,5),
        ],self.now)
        self.assertIsNone(plan)

    def test_window_increases_gradually(self):
        self.assertEqual(rating_window(0),25)
        self.assertEqual(rating_window(14),25)
        self.assertEqual(rating_window(15),50)
        self.assertEqual(rating_window(45),100)

    def test_no_bots_before_timeout(self):
        self.assertEqual(bot_slots(59,1),0)
        self.assertIsNone(choose_group([self.player("a",100,59)],self.now))

    def test_bot_fill_steps(self):
        self.assertEqual(bot_slots(60,3),1)
        self.assertEqual(bot_slots(60,2),1)
        self.assertEqual(bot_slots(75,2),2)
        self.assertEqual(bot_slots(90,1),3)

    def test_one_human_after_90_seconds(self):
        plan=choose_group([self.player("a",150,91)],self.now)
        self.assertEqual(len(plan.players),1)
        self.assertEqual(len(plan.bots),3)
        self.assertTrue(all(bot.rating==150 for bot in plan.bots))

    def test_earliest_player_prioritized(self):
        plan=choose_group([
            self.player("a",100,90),self.player("b",600,1),
            self.player("c",111,12),
        ],self.now)
        self.assertEqual(plan.players[0].user_id,"a")
        self.assertIn("c",[p.user_id for p in plan.players])
        self.assertNotIn("b",[p.user_id for p in plan.players])

    def test_duplicated_account_not_queued_twice(self):
        plan=choose_group([
            self.player("a",100,90), self.player("a",100,91),
        ],self.now)
        self.assertEqual(len(plan.players),1)
        self.assertEqual(len(plan.bots),3)


if __name__=="__main__":
    unittest.main()
