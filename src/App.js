import 'devextreme/dist/css/dx.common.css';
import 'devextreme/dist/css/dx.light.css';
import React from 'react';
import Board from './components/Board';
import Archiv from './components/Archiv';
import Admin from './components/Admin';
import './App.css';
import { BrowserRouter as Router, Route, Switch} from "react-router-dom";

function App() {
  return (
    <div className="App">
      <Router>
        <Switch>
          <Route path="/board">
              <Board />
          </Route>
          <Route path="/archiv">
              <Archiv />
          </Route>
          <Route path="/admin">
              <Admin />
          </Route>
          <Route exact path="/">
              <Board />
          </Route>>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
