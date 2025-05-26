import { StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../constants/theme'
import { hp } from '../helper/common'

const MyInput = (props) => {

  return (
    <View style={[styles.container, props.containerStyle && props.containerStyle]}>
      {
        props.icon && props.icon
      }
      {
        props.label && <Text style = {{color:theme.colors.textLight}}>{props.label}</Text>
      }
      <TextInput
        style = {{flex:1}}
        placeholderTextColor={theme.colors.textLight}
        ref = {props.inputRef && props.inputRef}
        {...props}
      />
    </View>
  )
}

export default MyInput

const styles = StyleSheet.create({
  container:{
    flexDirection:'row',
    height: hp(7),
    alignItems:'center',
    justifyContent:'center',
    borderWidth: 1,
    borderColor: theme.colors.textDark,
    borderRadius: 15,
    paddingHorizontal: 20,
    gap:15,
    backgroundColor:'white'
  }
})