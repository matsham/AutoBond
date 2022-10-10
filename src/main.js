import Web3 from "web3"
import { newKitFromWeb3 } from "@celo/contractkit"
import BigNumber from "bignumber.js"
import marketplaceAbi from "../contracts/AutoBan.abi.json"
import erc20Abi from "../contracts/erc20.abi.json"

const ERC20_DECIMALS = 18
const contractAddress = "0x5521e633ED2EdceFA53A9988408e4Cd5dc2DAa1a"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit
let contract
let Cars = []
const connectCeloWallet = async function () {
  if (window.celo) {
    notification("⚠️ Please approve this DApp to use it.")
    try {
      await window.celo.enable()
      notificationOff()

      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(marketplaceAbi, contractAddress)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.")
  }
}
async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(contractAddress, _price)
    .send({ from: kit.defaultAccount })
  return result
}

const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  document.querySelector("#balance").textContent = cUSDBalance
}
const getCars = async function () {
  const _TotalCars = await contract.methods.getTotalCars().call()
  const _Cars = []
  for (let i = 0; i < _TotalCars; i++) {
    let _Car = new Promise(async (resolve, reject) => {
      let p = await contract.methods.GetCar(i).call()
      resolve({
        index: i,
        owner: p[0],
        name: p[1],
        image: p[2],
        description: p[3],
        location: p[4],
        price: new BigNumber(p[5]),
        sold: p[6],
      })
    })
    _Cars.push(_Car)
  }
  Cars = await Promise.all(_Cars)
  renderCars()
}

function renderCars() {
  document.getElementById("AutoBan").innerHTML = ""
  Cars.forEach((_Car) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = CarTemplate(_Car)
    document.getElementById("AutoBan").appendChild(newDiv)
  })
}
function CarTemplate(_Car) {
  return `
      <div class="card mb-4">
        <img class="card-img-top" src="${_Car.image}" alt="...">
        <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
          ${_Car.sold} Sold
        </div>
        <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_Car.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_Car.name}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_Car.description}             
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_Car.location}</span>
        </p>
        <div class="d-grid gap-2">
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${
            _Car.index
          }>
            Buy for ${_Car.price
              .shiftedBy(-ERC20_DECIMALS)
              .toFixed(2)}  cUSD
          </a>
        </div>
        <div class="d-grid gap-2">
         <a class="btn btn-lg btn-outline-dark LeaseBtn fs-6 p-3" id=${
           _Car.index
          }>
            Buy for ${(_Car.price / 5)
              .shiftedBy(-ERC20_DECIMALS)
              .toFixed(2)}  cUSD
          </a>
        </div>
      </div>
    </div>
  `
}
function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
    <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
      <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
          target="_blank">
          <img src="${icon}" width="48" alt="${_address}">
      </a>
    </div>
    `
}

function notification(_text) {
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}

window.addEventListener("load", async () => {
  notification("⌛ Loading...")
  await connectCeloWallet()
  await getBalance()
  await getCars()
  notificationOff()
})

document
  .querySelector("#newCarBtn")
  .addEventListener("click", async (e) => {
    const paramsCar = [
      document.getElementById("newCarName").value,
      new BigNumber(document.getElementById("newPrice").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString(),
    ]
    const paramsCarData = [
      document.getElementById("newCarBrand").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newCarDescription").value,
      document.getElementById("newLocation").value,
    ]
    notification(`⌛ Adding "${params[0]}"...`)
    try {
      const result = await contract.methods.AddCar(...paramsCar).send({ from: kit.defaultAccount })
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`🎉 You successfully added "${params[0]}".`)
    getCars()
    try {
      const result2 = await contract.methods.AddCarData(...paramsCarData).send({ from: kit.defaultAccount })
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`🎉 You successfully added "${params[0]}".`)
    getCars()
  })

  document.querySelector("#AutoBan").addEventListener("click", async (e) => {
  if (e.target.className.includes("buyBtn")) {
    const index = e.target.id
    notification("⌛ Waiting for payment approval...")
    try {
      await approve(Cars[index].price)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting payment for "${Cars[index].name}"...`)
    try {
      const result3 = await contract.methods.buyCar(index).send({ from: kit.defaultAccount })
      notification(`🎉 You successfully bought "${Cars[index].name}".`)
      getCars()
      getBalance()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    } 
  } else if (e.target.className.includes("LeaseBtn")) {
    const index = e.target.id
    notification("⌛ Waiting for payment approval...")
    try {
      await approve((Cars[index].price)/ 5)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting Lease payment for "${Cars[index].name}"...`)
    try {
      const result4 = await contract.methods.LeaseCar(index).send({ from: kit.defaultAccount })
      notification(`🎉 You successfully Leased "${Cars[index].name}".`)
      getCars()
      getBalance()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  }

  

// const Cars = [
//     {
//       name: "Giant BBQ",
//       image: "https://i.imgur.com/yPreV19.png",
//       description: `Grilled chicken, beef, fish, sausages, bacon,
//         vegetables served with chips.`,
//       location: "Kimironko Market",
//       owner: "0x32Be343B94f860124dC4fEe278FDCBD38C102D88",
//       price: 3,
//       sold: 27,
//       index: 0,
//     },
//     {
//       name: "BBQ Chicken",
//       image: "https://i.imgur.com/NMEzoYb.png",
//       description: `French fries and grilled chicken served with gacumbari
//         and avocados with cheese.`,
//       location: "Afrika Fresh KG 541 St",
//       owner: "0x3275B7F400cCdeBeDaf0D8A9a7C8C1aBE2d747Ea",
//       price: 4,
//       sold: 12,
//       index: 1,
//     },
//     {
//       name: "Beef burrito",
//       image: "https://i.imgur.com/RNlv3S6.png",
//       description: `Homemade tortilla with your choice of filling, cheese,
//         guacamole salsa with Mexican refried beans and rice.`,
//       location: "Asili - KN 4 St",
//       owner: "0x2EF48F32eB0AEB90778A2170a0558A941b72BFFb",
//       price: 2,
//       sold: 35,
//       index: 2,
//     },
//     {
//       name: "Barbecue Pizza",
//       image: "https://i.imgur.com/fpiDeFd.png",
//       description: `Barbecue Chicken Pizza: Chicken, gouda, pineapple, onions
//         and house-made BBQ sauce.`,
//       location: "Kigali Hut KG 7 Ave",
//       owner: "0x2EF48F32eB0AEB90778A2170a0558A941b72BFFb",
//       price: 1,
//       sold: 2,
//       index: 3,
//     },
//   ]
// owner: "0x7Aa0245A692B67C7990c6bB4167F83f798654b26" 
})
