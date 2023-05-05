from pyteal import *

def clear_state_program():
    return Return(Int(1))

if __name__ == "__main__":
    clearstate_sc = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
    with open("./artifacts/game_clearstate.teal", "w") as f:
        f.write(clearstate_sc)