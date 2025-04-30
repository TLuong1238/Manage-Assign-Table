import { View, Text, Button } from 'react-native'
import React from 'react'
import ScreenWrapper from '../components/ScreenWrapper';
import Navigation from '../navigation';
import Loading from '../components/Loading';

export default function index() {

  return (
    <View style = {{flex:1, justifyContent:'center', alignItems:'center'}}>
      <Loading/>
    </View>
  )
}