const Greeter = artifacts.require("Greeter")

contract('Greeter', accounts => {
  it("Should work", async () => {
    greeter = await Greeter.at("0x317ccBB804c1f104b0fA1495B625c87F66091745")
    console.log(await greeter.greet())
  }); // it ... );
});  // contact ...
