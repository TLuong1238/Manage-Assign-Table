import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor'
import { theme } from '../constants/theme'

const RichTextEditor = ({
    editorRef,
    onChange
}) => {
    return (
        <View style={{ minHeight: 285 }}>
            <RichToolbar

                actions={[
                    // actions.insertImage,
                    actions.setBold,
                    actions.setItalic,
                    actions.insertBulletsList,
                    actions.insertOrderedList,
                    actions.insertLink,
                    actions.keyboard,
                    actions.setStrikethrough,
                    actions.setUnderline,
                    actions.removeFormat,
                    // actions.insertVideo,
                    actions.checkboxList,
                    actions.heading1,
                    actions.heading4,
                    actions.undo,
                    actions.redo,
                ]}
                iconMap={{
                    [actions.heading1]: ({ tintColor }) => <Text style={{ color: tintColor }}>H1</Text>,
                    [actions.heading4]: ({ tintColor }) => <Text style={{ color: tintColor }}>H4</Text>,
                }}
                style={styles.richBar}
                flatContainerStyle={styles.listStyle}
                selectedIconTint={theme.colors.primaryDark}
                editor={editorRef}
                disabled={false}
            />
            {/* editor */}
            <RichEditor
                ref={editorRef}
                containerStyle={styles.rich}
                editorStyle={{
                    backgroundColor: 'white',
                    padding: 10,
                }}
                placeholder={"Bạn đang nghĩ gì?"}
                onChange={onChange}
                showsVerticalScrollIndicator={false}
            />
        </View>
    )
}

export default RichTextEditor

const styles = StyleSheet.create({
    richBar: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: theme.colors.gray
    },
    rich: {
        minHeight: 240,
        flex: 1,
        borderWidth: 1.5,
        borderColor: theme.colors.gray,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        backgroundColor: 'white',
        borderTopWidth: 0,
        padding: 5
    },
    contentStyle: {
        backgroundColor: 'white',
        padding: 10,
    },
    listStyle: {
        paddingHorizontal: 8,
        gap: 3
    }
})