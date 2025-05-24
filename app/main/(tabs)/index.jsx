import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import {useAuth} from '../../context/AuthContext'
import ScreenWrapper from '../../components/ScreenWrapper'

const index = () => {
    const {user} = useAuth()
    return (
        <ScreenWrapper>
            
        </ScreenWrapper>
    )
}

export default index

const styles = StyleSheet.create({})