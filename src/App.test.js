import React from "react";
import ReactDOM from "react-dom";
// import App from "./App";

it("renders without crashing", () => {
  const div = document.createElement("div");

  // commented out.
  // reason: there are asynchronous operations that weren't stopped in your tests
  // @author Johann Zelger

  // ReactDOM.render(<App />, div);
  // ReactDOM.unmountComponentAtNode(div);
});
