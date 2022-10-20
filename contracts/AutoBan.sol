// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/Counters.sol";

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external view returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external view returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract AutoBan {
    address private cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    using Counters for Counters.Counter;
    Counters.Counter totalCars;

    struct Car {
        address payable Dealer;
        string name;
        CarData carData;
        uint256 price;
        uint256 sold;
        bool leased;
        uint leaseEndAt;
    }

    struct CarData {
        string brand;
        string image;
        string description;
        string location;
    }

    mapping(uint256 => Car) private Cars;

    // keeps track of the number of cars an address has bought
    mapping(address => uint256) private NOCB;

    // checks if caller can lease or buy a car
    modifier canLeaseOrBuy(uint _index){
        require(
            msg.sender != Cars[_index].Dealer,
            "You can't lease your own car"
        );
        require(!Cars[_index].leased, "Car is not up for lease");
        _;
    }

    modifier exists(uint _index){
        require(_index < totalCars.current(), "Query of nonexistent car");
        _;
    }

    modifier validInput(string calldata _input){
        require(bytes(_input).length > 0, "enter valid input");
        _;
    }

    /**
        * @dev allow car dealers to add a car to lease/sell on the platform
        * @notice input data needs to contain only valid/non-empty values
     */
    function AddCar(
        string calldata _name,
        uint256 _price,
        bool _leased,
        uint leaseEndAt,
        string calldata _brand,
        string calldata _image,
        string calldata _description,
        string calldata _location
    ) public 
      validInput(_name) validInput(_brand)
      validInput(_image) validInput(_description)
      validInput(_location)
    {
        require(leaseEndAt > block.timestamp, "Invalid date for end of lease");
        Cars[totalCars.current()] = Car(
            payable(msg.sender),
            _name,
            CarData(_brand, _image, _description, _location),
            _price,
            0,
            _leased,
            leaseEndAt
        );
        totalCars.increment();
    }

    /**
        * @dev allow customers to buy a car that is available
     */
    function buyCar(uint256 _index) public payable exists(_index) canLeaseOrBuy(_index) {
        Car storage currentCar = Cars[_index];
        currentCar.sold++;
        NOCB[msg.sender]++;
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                currentCar.Dealer,
                currentCar.price
            ),
            "Transfer failed."
        );
    }

    /**
        * @dev allow car dealers to put a car back up for sale/leasing when the leasing agreement has ended
     */
    function PutCarUpForLease(uint256 _index) public exists(_index) {
        require(
            msg.sender == Cars[_index].Dealer,
            "This is not yours to lease"
        );
        require(
            Cars[_index].leaseEndAt < block.timestamp, "Lease is not over yet"
        );
        Cars[_index].leased = false;
    }

    /**
        @dev allow customers to lease a car
        @param leaseDuration the duration of the lease agreement
     */
    function LeaseCar(uint256 _index, uint leaseDuration) public  exists(_index) canLeaseOrBuy(_index) {
        require(NOCB[msg.sender] >= 3, "You need to at least buy 3 cars to be eligible to lease a car");
        Car storage currentCar = Cars[_index];
        uint256 LeasePrice = currentCar.price / 5;
        currentCar.leased = true;
        currentCar.leaseEndAt = block.timestamp + leaseDuration;
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                currentCar.Dealer,
                LeasePrice
            ),
            "Transfer failed."
        );
    }


    function GetCar(uint256 _index)
        public
        view
        exists(_index)
        returns (
            address payable,
            string memory,
            uint256,
            uint256,
            bool,
            uint
        )
    {
        return (
            Cars[_index].Dealer,
            Cars[_index].name,
            Cars[_index].price,
            Cars[_index].sold,
            Cars[_index].leased,
            Cars[_index].leaseEndAt
        );
    }
    function getTotalCars() public view returns (uint256) {
        return (totalCars.current());
    }
}
