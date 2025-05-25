import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { theme } from '../constants/theme'
import { hp } from '../helper/common'
import MyLoading from './MyLoading'

const MyButton = (
    { buttonStyle,
        textStyle,
        title = '',
        onPress = () => { },
        loading = false,
        hasShadow = true,
        icon,
    }
) => {
    const shadowStyle = {
        shadowColor: theme.colors.dark,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
    if (loading) {
        return (
            <View style={[styles.button, buttonStyle, { backgroundColor: "white" }]}>
                <MyLoading />
            </View>
        )
    }
    return (
        <Pressable onPress={onPress} style={[styles.button, buttonStyle, hasShadow && shadowStyle]}>
            {icon ? (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </View>
            ) : (
                title ? (
                    <Text style={[styles.text, textStyle]}>{title}</Text>
                ) : null
            )}
        </Pressable>
    )
}

export default MyButton

const styles = StyleSheet.create({
    button: {
        backgroundColor: 'white',
        height: hp(7),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        borderCurve: 'continuous',
        padding: 10,
    },
    text: {
        fontSize: hp(2.5),
        color: 'black',
        fontWeight: 'bold',
    }
})