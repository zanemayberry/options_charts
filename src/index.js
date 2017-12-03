import React from 'react';
import ReactDOM from 'react-dom';
import Highcharts from 'highcharts';
import './index.css';

class Chart extends React.Component {
  componentDidMount() {
    if (this.props.modules) {
        this.props.modules.forEach(function (module) {
            module(Highcharts);
        });
    }

    this.chart = new Highcharts.Chart(
        this.props.container,
        this.props.options
    );

    this.props.onChartCreated(this.chart);
  }

  componentWillUnmount () {
    this.chart.destroy();
  }

  render() {
    return <div id={this.props.container}></div>;
  }
}

const Action = {
  Buy: 1,
  Short: 2,
  BuyCall: 3,
  BuyPut: 4,
  WriteCall: 5,
  WritePut: 6,
};

function ActionSelect(props) {
  var onChange = function(event) {
    var newVal = parseInt(event.target.value, 10);
    if (!props.onChange) return;
    props.onChange(newVal);
  };

  return (
    <select value={props.value} onChange={onChange}>
      <option value={Action.Buy}>Buy</option>
      <option value={Action.Short}>Sell</option>
      <option value={Action.BuyCall}>Buy Call</option>
      <option value={Action.BuyPut}>Buy Put</option>
      <option value={Action.WriteCall}>Sell Call</option>
      <option value={Action.WritePut}>Sell Put</option>
    </select>
  );
}

function NumberInput(props) {
  var onChange = function(event) {
    var newVal = parseFloat(event.target.value);
    if (!props.onChange) return;
    props.onChange(newVal);
  };

  return (
    <input type="number" value={props.value} onChange={onChange} />
  );
}

function Order(props) {
  var action = props.action;
  if (action !== Action.Buy && action !== Action.Short) {
    return (
      <li>
        <button onClick={props.onRemove}>-</button>
        Action: <ActionSelect value={props.action} onChange={props.updateAction}/>
        Quantity: <NumberInput value={props.quantity} onChange={props.updateQuantity}/>
        Price: <NumberInput value={props.price} onChange={props.updatePrice}/>
        Strike Price: <NumberInput value={props.strikePrice} onChange={props.updateStrikePrice}/>
      </li>
    );
  }
  return (
    <li>
      <button onClick={props.onRemove}>-</button>
      Action: <ActionSelect value={props.action} onChange={props.updateAction}/>
      Quantity: <NumberInput value={props.quantity} onChange={props.updateQuantity}/>
      Price: <NumberInput value={props.price} onChange={props.updatePrice}/>
    </li>
  );
}

class Interface extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentPrice: 0,
      orders: [],
    };

    this.chartOptions = this.getDefaultChart();
    this.chart = undefined;

    this.addOrder = this.addOrder.bind(this);
    this.removeOrder = this.removeOrder.bind(this);
    this.updateAction = this.updateAction.bind(this);
    this.updateQuantity = this.updateQuantity.bind(this);
    this.updatePrice = this.updatePrice.bind(this);
    this.updateStrikePrice = this.updateStrikePrice.bind(this);
    this.updateCurrentPrice = this.updateCurrentPrice.bind(this);
    this.onChartCreated = this.onChartCreated.bind(this);
  }

  computeReturn(order, price) {
    var delta = 0;
    switch (order.action) {
      case Action.Buy:
        delta = price - order.price;
        break;
      case Action.Short:
        delta = order.price - price;
        break;
      case Action.BuyCall:
        delta = Math.max((price - order.strikePrice), 0) - order.price;
        break;
      case Action.BuyPut:
        delta = Math.max((order.strikePrice - price), 0) - order.price;
        break;
      case Action.WriteCall:
        delta = -(Math.max((price - order.strikePrice), 0) - order.price);
        break;
      case Action.WritePut:
        delta = -(Math.max((order.strikePrice - price), 0) - order.price);
        break;
    }
    return delta * order.quantity;
  }

  updateCurrentPrice(val) {
    this.setState({ currentPrice: val });
  }

  updateOrder(i, prop, val) {
    var order = Object.assign({}, this.state.orders[i]);
    order[prop] = val;
    var orders = this.state.orders.slice();
    orders.splice(i, 1, order);
    this.setState({ orders: orders });
  }

  updateAction(i, v) {
    this.updateOrder(i, 'action', v);
  }

  updateQuantity(i, v) {
    this.updateOrder(i, 'quantity', v);
  }

  updatePrice(i, v) {
    this.updateOrder(i, 'price', v);
  }

  updateStrikePrice(i, v) {
    this.updateOrder(i, 'strikePrice', v);
  }

  addOrder() {
    var orders = this.state.orders.slice();
    orders.push({
      action: Action.Buy,
      quantity: 0,
      price: 0,
      strikePrice: 0,
    });
    this.setState({ orders: orders });
  }

  removeOrder(idx) {
    var orders = this.state.orders.slice();
    orders.splice(idx, 1);
    this.setState({ orders: orders });
  }

  updateSeries() {
    var currentPrice = this.state.currentPrice;
    if (!currentPrice || currentPrice <= 0) return;

    var minWindow = currentPrice * .8;
    var maxWindow = currentPrice * 1.2;
    var step = (maxWindow - minWindow) / 100;

    var orders = this.state.orders.slice();
    var data = [];
    for (var price = minWindow; price < maxWindow; price += step) {
      var delta = 0;
      for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        delta += this.computeReturn(order, price);
      }
      data.push([price, delta]);
    }

    this.chart.series[0].setData(data, true);
  }

  getDefaultChart() {
    return {
      chart: {
        type: 'scatter',
      },
      plotOptions: {
        scatter: {
          lineWidth: 2
        },
        series: {
          marker: {
            enabled: false
          }
        }
      },
      title: {
        text: 'Price / Return'
      },
      xAxis: {
        title: {
          enabled: true,
          text: 'Price'
        },
        startOnTick: true,
        endOnTick: true,
        showLastLabel: true
      },
      yAxis: {
        title: {
          text: 'Return'
        }
      },
      tooltip: {
        shared: true,
        headerFormat: 'Return: {point.y:.2f}<br>',
        pointFormat: 'Price: {point.x:.2f}',
      },
      series: [{data: []}]
    }
  }

  onChartCreated(chart) {
    this.chart = chart;
  }

  render() {
    var orders = [];
    for (var i = 0; i < this.state.orders.length; i++) {
      const k = i;
      var o = this.state.orders[i];
      orders.push(<Order
        key={k}
        onRemove={() => this.removeOrder(k)}
        updateAction={(v) => this.updateAction(k, v)}
        updateQuantity={(v) => this.updateQuantity(k, v)}
        updatePrice={(v) => this.updatePrice(k, v)}
        updateStrikePrice={(v) => this.updateStrikePrice(k, v)}
        action={o.action}
        quantity={o.quantity}
        price={o.price}
        strikePrice={o.strikePrice}
      />);
    }

    this.updateSeries();

    return (
      <div className="interface">
        <div className="ui-chart">
          <Chart container="chart" options={this.chartOptions} onChartCreated={this.onChartCreated}/>
        </div>
        <div className="ui-controls">
          Current Price: <NumberInput value={this.state.currentPrice} onChange={this.updateCurrentPrice}/>
          <button onClick={this.addOrder}>+</button>
          <ul>{orders}</ul>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <Interface />,
  document.getElementById('root'),
);
