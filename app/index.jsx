import { View, Text, Button } from 'react-native'
import React from 'react'
import ScreenWrapper from '../components/ScreenWrapper';
import Navigation from '../navigation';
import MyLoading from '../components/MyLoading';

export default function index() {

  return (
    <View style = {{flex:1, justifyContent:'center', alignItems:'center'}}>
      <MyLoading/>
    </View>
  )
}