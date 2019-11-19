import React, { Component, useCallback, useState } from 'react'
import './app.css'
import Cookies from 'universal-cookie';
import exportFromJSON from 'export-from-json'

import {
  Page,
  Layout,
  Card,
  ResourceList,
  List,
  Avatar,
  TextStyle,
  Button,  
  Autocomplete,
  Icon,
  RangeSlider,
  Banner,
} from '@shopify/polaris'
import {
  CircleCancelMajorMonotone,
  CircleMinusMajorMonotone,
  SearchMinor
} from '@shopify/polaris-icons';
import { stat } from 'fs';

type Props = {}

type Product = {
  id: number,
  name: string,
  description: string,
  price: number,
  tax: number,
}

type CartProduct = {
  productId: number,
  quantity: number,
}

type State = {
  data: {
    products: Product[],
    productsCopy: Product []
  },
  cart: {
    products: CartProduct[],
    taxes: Array<{
      name: number,
      value: number,
    }>,
    totalAmountIncludingTaxes: number,
    remise:boolean
  },
}

export default class App extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      data: {
        products: [
          {
            id: 0,
            name: 'Product A',
            description: 'Lorem ipsum dolor sit, amet consectetur',
            price: 12,
            tax: 20,
          },
          {
            id: 1,
            name: 'Product B',
            description: 'Lorem ipsum dolor sit, amet consectetur',
            price: 50,
            tax: 5.5,
          },
          {
            id: 2,
            name: 'Product C',
            description: 'Lorem ipsum dolor sit, amet consectetur',
            price: 25,
            tax: 5.5,
          },
        ],
        productsCopy: [
          {
            id: 0,
            name: 'Product A',
            description: 'Lorem ipsum dolor sit, amet consectetur',
            price: 12,
            tax: 20,
          },
          {
            id: 1,
            name: 'Product B',
            description: 'Lorem ipsum dolor sit, amet consectetur',
            price: 50,
            tax: 5.5,
          },
          {
            id: 2,
            name: 'Product C',
            description: 'Lorem ipsum dolor sit, amet consectetur',
            price: 25,
            tax: 5.5,
          },
        ],
      },
      cart: {
        products: [
        ],
        taxes: [

        ],
        totalAmountIncludingTaxes: 0,
        remise:false
      },
    }
    this.addToBasket = this.addToBasket.bind(this)
    this.exportdataTojsonFile = this.exportdataTojsonFile.bind(this)
    this.deleteFromBasket = this.deleteFromBasket.bind(this)
    this.deleteProductFromBasket = this.deleteProductFromBasket.bind(this)
    this.AutocompleteExample = this.AutocompleteExample.bind(this)
    this.RangeSliderWithPreciseRangeControlExample = this.RangeSliderWithPreciseRangeControlExample.bind(this)
  }

 exportdataTojsonFile(){
  const data = this.state.data.productsCopy
  const fileName = 'download'
  const exportType = 'json'
   
  exportFromJSON({ data, fileName, exportType })
  }
  AutocompleteExample() {
    const deselectedOptions : any[] = []
    this.state.data.productsCopy.map(p=>{
      deselectedOptions.push({
        value : p.name,
        label : p.name,
        productId : p.id
      })
    })
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [options, setOptions] = useState(deselectedOptions);
  
    const updateText = useCallback(
      (value) => {
        setInputValue(value);
  
        if (value === '') {
          setOptions(deselectedOptions);
          let stateToUpdate = Object.assign({},this.state)
          stateToUpdate.data.products= stateToUpdate.data.productsCopy
          this.setState(stateToUpdate)
          return;
        }
  
        const filterRegex = new RegExp(value, 'i');
        const resultOptions = deselectedOptions.filter((option) =>
          option.label.match(filterRegex),
        );
        setOptions(resultOptions);
      },
      [deselectedOptions],
    );
  
    const updateSelection = useCallback((selected) => {
      const selectedValue = selected.map((selectedItem : any) => {
        const matchedOption = options.find((option : any) => {
          return option.value.match(selectedItem);
        });
        let stateToUpdate = Object.assign({},this.state)
        const product = stateToUpdate.data.productsCopy.find(p=> p.id === matchedOption.productId)
        if(product){
          stateToUpdate.data.products=[]
          stateToUpdate.data.products.push(product)
          this.setState(stateToUpdate)
        }
        return matchedOption && matchedOption.label;
      });
      setSelectedOptions(selected);
      setInputValue(selectedValue);
    }, []);
  
    const textField = (
      <Autocomplete.TextField
        onChange={updateText}
        label="Product Name "
        value={inputValue}
        prefix={<Icon source={SearchMinor} color="inkLighter" />}
        placeholder="Search"
      />
    );
  
    return (
      <div style={{padding: '40px'}}>
        <Autocomplete
          options={options}
          selected={selectedOptions}
          onSelect={updateSelection}
          textField={textField}
        />
      </div>
    );
  }
  deleteFromBasket(id: number){
    let stateToUpdate = Object.assign({},this.state)
    stateToUpdate.cart.products.map((product,index)=>{
      if(product.productId === id){
        this.removeAllQuantityProductFromTax(id , product.quantity)
        stateToUpdate.cart.products.splice(index,1)
      }
      
    })
    const cookies = new Cookies();
    stateToUpdate=this.calculTotal(stateToUpdate);
    cookies.set('cart', stateToUpdate, { path: '/' });
    this.setState(stateToUpdate)
  }
  deleteProductFromBasket ( id : number){
    let stateToUpdate = Object.assign({},this.state)
    stateToUpdate.cart.products.map((product,index)=>{
      if(product.productId === id){
        stateToUpdate.cart.products[index]=Object.assign({},{
          productId : product.productId,
          quantity : product.quantity - 1
        })
        if (stateToUpdate.cart.products[index].quantity == 0 ){
          stateToUpdate.cart.products.splice(index,1)
        }
      }
      
    })
    this.removeFromTax(id)
    const cookies = new Cookies();
    stateToUpdate=this.calculTotal(stateToUpdate);
    cookies.set('cart', stateToUpdate, { path: '/' });
    this.setState(stateToUpdate)
  }
  removeFromTax(id : number){
    let stateToUpdate = Object.assign({},this.state)
    const product = stateToUpdate.data.products.find(p=> p.id === id)
    if(product){
      const test = stateToUpdate.cart.taxes.map((tax,index)=>{
        if(tax.name === product.tax){
          stateToUpdate.cart.taxes[index].value -= (product.price * (product.tax /100))
          return true
        }
      })
    }
    return stateToUpdate
  }
  removeAllQuantityProductFromTax(id : number, quantity : number){
    let stateToUpdate = Object.assign({},this.state)
    const product = stateToUpdate.data.products.find(p=> p.id === id)
    if(product){
      const test = stateToUpdate.cart.taxes.map((tax,index)=>{
        if(tax.name === product.tax){
          stateToUpdate.cart.taxes[index].value -= (quantity*(product.price * (product.tax /100)))
          return true
        }
      })
    }
    return stateToUpdate
  }
  addTaxe(id : number){
    let stateToUpdate = Object.assign({},this.state)
    const product = stateToUpdate.data.products.find(p=> p.id === id)
    if(product){
      const test = stateToUpdate.cart.taxes.map((tax,index)=>{
        if(tax.name === product.tax){
          stateToUpdate.cart.taxes[index].value += (product.price * (product.tax /100))
          return true
        }
      })
      if(test.every(element => element === undefined)){
        stateToUpdate.cart.taxes.push({
          name : product.tax,
          value : product.price * (product.tax /100)
        })
      }
    }
    return stateToUpdate
  }
   addToBasket(id: number) {
    let stateToUpdate = Object.assign({},this.state)
    const test =  stateToUpdate.cart.products.map((product,index)=>{
      if(product.productId === id){
        stateToUpdate = this.addTaxe(id)
        stateToUpdate.cart.products[index]=Object.assign({},{
          productId : product.productId,
          quantity : product.quantity + 1
        })
        return true
      }
      
    })
    if(test.every(element => element === undefined)){
      stateToUpdate = this.addTaxe(id)
      stateToUpdate.cart.products.push({
        productId : id,
        quantity : 1
      })
    }
    const cookies = new Cookies();
    stateToUpdate=this.calculTotal(stateToUpdate);
    cookies.set('cart', stateToUpdate, { path: '/' });
    this.setState(stateToUpdate)
  }
  calculTotal(stateToUpdate : State){
    let totalPriceProducts =0
    let totalTaxes = 0
    stateToUpdate.cart.products.map(product=>{
      const p = stateToUpdate.data.products.find(p=> p.id === product.productId)
      if(p){
        totalPriceProducts += p.price * product.quantity
      }
    })
    stateToUpdate.cart.taxes.map(tax=>{
      if(tax){
        totalTaxes += tax.value
      }
    })
    const productCartCount =stateToUpdate.cart.products.reduce((a,b)=>a+b.quantity,0)
    let remise=0;
    if(productCartCount == 10){
      remise =(totalTaxes+totalPriceProducts)*0.2
      stateToUpdate.cart.remise=true;
    }else{
      stateToUpdate.cart.remise=false;
    }
    stateToUpdate.cart.totalAmountIncludingTaxes = (totalTaxes+totalPriceProducts)-remise
    return stateToUpdate
  }
  RangeSliderWithPreciseRangeControlExample() {
    const [rangeValue, setRangeValue] = useState(0);
    let priceArray = this.state.data.productsCopy.map(a => a.price);
    const min = Math.min.apply(null, priceArray) 
    const max = Math.max.apply(null, priceArray)
    const handleRangeSliderChange = useCallback(
      (value) => {
        setRangeValue(value)
        let productArrayFiltredByPrice = this.state.data.productsCopy.filter(a => a.price >= value);
        let stateToUpdate = Object.assign({},this.state)
        stateToUpdate.data.products=productArrayFiltredByPrice
        this.setState(stateToUpdate)
      },
      [],
    );
    
    return (
      <Card sectioned title="Price Filter">
        <RangeSlider
          output
          label="Minimun price"
          min={min}
          max={max}
          value={rangeValue}
          onChange={handleRangeSliderChange}
        />
      </Card>
    );
  }
  getProductPriceById(id : number) {
    const p = this.state.data.products.find(product => product.id === id)
    if(p){
      return p.price;
    }
  }
  componentDidMount(){
    let stateToUpdate = Object.assign({},this.state)
    const cookies = new Cookies();
    const cart =cookies.get('cart')
    if(cart){
      stateToUpdate=Object.assign({},cart);
    }
    this.setState(stateToUpdate)
  }
  render() {
    const { data, cart } = this.state
    return (
      <Page title="React Shopping Cart" >
        <Layout>
          <Layout.Section>
            {
              cart.remise ?
              <Banner
              title="You Got a sold"
              status="success"
              onDismiss={() => {}}
            />:
            <Banner
            title="Solde"
            status="info"
            onDismiss={() => {}}
          >
            <p>if you get 10 product you will get a sold.</p>
          </Banner>
            }
         
            <Card>
            <this.AutocompleteExample/>
            <this.RangeSliderWithPreciseRangeControlExample/>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <ResourceList
                resourceName={{ singular: 'customer', plural: 'customers' }}
                items={data.products}
                renderItem={item => {
                  const { id, name, description } = item
                  const media = (
                    <Avatar customer={true} size="medium" name={name} />
                  )
                  const shortcutActions = [
                    {
                      content: 'Add to basket (+1)',
                      onAction: () => this.addToBasket(id),
                    },
                  ]
                  return (
                    // @ts-ignore
                    <ResourceList.Item
                      id={id}
                      media={media}
                      accessibilityLabel={`View details for ${name}`}
                      shortcutActions={shortcutActions}
                      persistActions={true}
                      onClick={console.log}
                    >
                      <h3>
                        <TextStyle variation="strong">{name}</TextStyle>
                      </h3>
                      <div>{description}</div>
                    </ResourceList.Item>
                  )
                }}
                
              />
              <Button id="exportButton" onClick={()=> this.exportdataTojsonFile()} primary>export as Json</Button>
            </Card>
          </Layout.Section>
          <Layout.Section secondary>
            <Card
              title="Basket"
              secondaryFooterAction={{ content: 'Cancel cart' }}
              primaryFooterAction={{ content: 'Pay' }}
            >
              <Card.Section title="Items">
                <List>
                  {cart.products.map(product => (
                    <List.Item>{product.quantity} × {this.getProductPriceById(product.productId)}  <Button onClick={()  => this.deleteProductFromBasket(product.productId)} icon={CircleMinusMajorMonotone}></Button>  <Button onClick={()  => this.deleteFromBasket(product.productId)} icon={CircleCancelMajorMonotone}></Button></List.Item>
                    
                  ))}
                </List>
              </Card.Section>
              <Card.Section title="Totals">
                <List>
                  {cart.taxes.map(tax => (
                    <List.Item>
                      TVA {tax.name}% : {tax.value.toFixed(2)}€
                    </List.Item>
                  ))}
                  <List.Item>
                    {cart.totalAmountIncludingTaxes.toFixed(2)}€ TTC
                  </List.Item>
                </List>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }
}
