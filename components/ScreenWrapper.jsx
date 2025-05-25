import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const ScreenWrapper = ({ children, bg }) => {
    const insets = useSafeAreaInsets();
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                // paddingLeft: insets.left,
                // paddingRight: insets.right,
            }}
        >
            {children}
        </View>
    );
};

export default ScreenWrapper

const styles = StyleSheet.create({})