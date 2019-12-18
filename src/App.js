import 'devextreme/dist/css/dx.common.css';
import 'devextreme/dist/css/dx.light.css';
import React from 'react';
import Board from './components/Board';
import Archiv from './components/Archiv';
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

function App() {
  return (
    <div className="App">
    <Router>
      <div>
        <Switch>
          <Route path="/archiv">
            <Archiv></Archiv>
          </Route>
          <Route path="/">
            <Board></Board>
          </Route>
        </Switch>
      </div>
    </Router>
    </div>
  );
}

export default App;
