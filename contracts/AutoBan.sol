// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

//import "@openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IERC20Token {
  function transfer(address, uint256) external view returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external view returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract AutoBan{

    // string internal product;
    // mapping (uint => string) internal Cars;
    uint internal TotalCars = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
     
    struct Car {
        address payable Dealer;
        string name;
        uint price;
        uint sold;
        bool Leasable;
        bool leased;
    }

    struct CarData {
        string brand;
        string image;
        string description;
        string location;
    }
    
    mapping (uint => Car) internal Cars;
    mapping (uint => CarData) internal CarsData;
    mapping (address => uint) internal NOCB;
    mapping (address => bool) internal Authorized;
    //mapping (string => uint) public CarIndexes;


   function AddCar(
		string calldata _name,
		uint _price,
        bool _leasable,
        bool _leased
	) public {
		uint _sold = 0;
		Cars[TotalCars] = Car(
			payable(msg.sender),
			_name,
			_price,
			_sold,
            _leasable,
            _leased
        );

        TotalCars++;
	}

    function AddCarData(
        uint _index,
        string calldata _brand,
		string calldata _image,
		string calldata _description, 
		string calldata _location 
        
	) public {	
        CarsData[_index] = CarData(
            _brand,
			_image,
			_description,
			_location
        );
	}

   	function GetCar (uint _index) public view returns (
		address payable,
		string memory,  
		uint, 
		uint,
        bool,
        bool
	) {
		return (
			Cars[_index].Dealer, 
			Cars[_index].name, 
			Cars[_index].price,
			Cars[_index].sold,
            Cars[_index].leased,
            Cars[_index].Leasable
		);
	}
    
    function LeaseCar (uint _index) public {
        require (NOCB[msg.sender] >= 3, "You are not elidgable to lease a car" );
        require (Cars[_index].Leasable, "Car is not up for lease");
        uint LeasePrice = Cars[_index].price / 5;
        Cars[_index].leased = true;
        require(
		  IERC20Token(cUsdTokenAddress).transferFrom(
			msg.sender,
			Cars[_index].Dealer,
			LeasePrice
		   ),
		  "Transfer failed."
		);
    }

    function PutCarUpForLease (uint _index) public {
        require(msg.sender == Cars[_index].Dealer, "This is not yours to lease");
        Cars[_index].Leasable = true;
    }
    
    function buyCar(uint _index) public payable  {
        require(!Cars[_index].leased , "Car has been leased out");
        Cars[_index].sold++;
	  	require(
		  IERC20Token(cUsdTokenAddress).transferFrom(
			msg.sender,
			Cars[_index].Dealer,
			Cars[_index].price
		   ),
		  "Transfer failed."
		);
		
        NOCB[msg.sender] ++;
	}

    function getTotalCars() public view returns (uint) {
        return (TotalCars);
    }
}