import 'devextreme/dist/css/dx.common.css';
import 'devextreme/dist/css/dx.light.css';
import React, {useState, useEffect} from 'react';
import Board from './components/Board';
import Archiv from './components/Archiv';
import './App.css';
import { BrowserRouter as Router, Switch, Route, Redirect} from "react-router-dom";
import axios from 'axios';

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    authenticate();
  }, []);

  const authenticate = async () => {
    let response = await axios.get('http://localhost:8001/authenticate');
    if(response.status === 200) {
      setAuthenticated(true);
    }
  }

  const PrivateRoute = ({ component: Component, ...rest }) => (
    <Route {...rest} render={(props) => (
      authenticated === true
        ? <Component {...props} />
        : <Redirect to='/login' />
    )} />
  )

  return (
    <div className="App">
      <Router>
        <Switch>
          <PrivateRoute path="/board" component={Board} />
          <PrivateRoute path="/login" component={Board} />
          <PrivateRoute path="/archiv" component={Archiv} />
          <PrivateRoute path="/" exact component={Board} />
        </Switch>
      </Router>
    </div>
  );
}

export default App;
