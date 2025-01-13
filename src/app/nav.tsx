//import Dropdown from "./Dropdown.js";
import "./Nav.css";

function Nav() {
    return (
        <nav>
            Nav
        </nav>
    )
}

// class Nav extends React.Component {

//   constructor(props) {
//     super(props);
//     this.state = {
//       categories: ["friends"],
//       main: this.props.main,
//     };

//     this.changeMain = this.changeMain.bind(this);
//   };

//   changeMain = (page,main) => {
//     this.props.changeMain(page,main);
//   };

//   render() {
//     return(
//       <nav>
//         {this.state.categories.map((c) =>
//           <Dropdown key={c} title={c} links={this.props.friends} changeMain={this.changeMain} />
//         )}
//       </nav>
//     );
//   };
// };

export default Nav;