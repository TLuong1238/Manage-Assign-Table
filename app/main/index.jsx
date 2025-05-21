import { View } from 'react-native'
import MyLoading from '../../components/MyLoading'


export default function index() {

  return (
    <View style = {{flex:1, justifyContent:'center', alignItems:'center'}}>
      <MyLoading/>
    </View>
  )
}