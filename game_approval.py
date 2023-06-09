from pyteal import *

PLAYER_DAMAGE = Int(2)


def game():
    """
    Initialize monster with specified health
    """
    monsterHealth = Btoi(Txn.application_args[0])
    handle_creation = Seq(
        Assert(monsterHealth >= Int(5)),
        App.globalPut(Bytes("Health"), monsterHealth),
        App.globalPut(Bytes("MaxDamage"), Int(0)),
        App.globalPut(Bytes("Mvp"), Bytes("")),
        Return(Int(1)),
    )

    """
    Initialize player's damage dealt to the monster
    """
    handle_optin = Seq(
        Assert(App.optedIn(Txn.sender(), Txn.application_id())),
        App.localPut(Txn.sender(), Bytes("Damage"), Int(0)),
        Return(Int(1)),
    )

    """
    Attacks the monster
    """
    currentMonsterHealth = App.globalGet(Bytes("Health"))

    playerCurrentDamage = App.localGet(
        Txn.sender(), Bytes("Damage")
    )  # returns 0 if state is not found

    highestDamage = App.globalGet(
        Bytes("MaxDamage")
    )  # highest amount of damage dealt to monster

    update_monster_health = If(
        PLAYER_DAMAGE > currentMonsterHealth,
        App.globalPut(Bytes("Health"), Int(0)),  # monster is dead
        App.globalPut(
            Bytes("Health"), currentMonsterHealth - PLAYER_DAMAGE
        ),  # reduce monster health
    )

    update_player_total_damage = App.localPut(
        Txn.sender(), Bytes("Damage"), playerCurrentDamage + PLAYER_DAMAGE
    )

    update_mvp = If(
        playerCurrentDamage + PLAYER_DAMAGE > highestDamage,
        Seq(
            App.globalPut(Bytes("Mvp"), Txn.sender()),
            App.globalPut(Bytes("MaxDamage"), playerCurrentDamage + PLAYER_DAMAGE),
        ),
    )

    attack_monster = Seq(
        Assert(currentMonsterHealth > Int(0)),
        update_monster_health,
        update_mvp,
        update_player_total_damage,
        Return(Int(1)),
    )

    """
    Reward player
    """
    mvp = App.globalGet(Bytes("Mvp"))
    reward_player = Seq(
        [
            Assert(Txn.sender() == Global.creator_address()),
            Assert(currentMonsterHealth <= Int(0)),
            Assert(Txn.accounts[1] == mvp),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: Txn.accounts[1],
                    TxnField.amount: Int(1000000),
                    TxnField.fee: Int(0),
                }
            ),
            InnerTxnBuilder.Submit(),
            Return(Int(1)),
        ]
    )

    handle_noop = Seq(
        Assert(Global.group_size() == Int(1)),
        Cond(
            [Txn.application_args[0] == Bytes("Attack"), attack_monster],
            [Txn.application_args[0] == Bytes("Reward"), reward_player],
        ),
    )

    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop],
    )

    return program


if __name__ == "__main__":
    game_sc = compileTeal(game(), mode=Mode.Application, version=8)
    with open("./artifacts/game_approval.teal", "w") as f:
        f.write(game_sc)
