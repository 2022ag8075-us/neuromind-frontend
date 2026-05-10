import React, { useMemo } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import ChatScreen from "../screens/ChatScreen";
import MoodScreen from "../screens/MoodScreen";
import CustomDrawer from "./CustomDrawer";

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      drawerStyle: {
        backgroundColor: "#0f172a",
        width: 280,
      },
      sceneContainerStyle: {
        backgroundColor: "#0f172a",
      },
    }),
    []
  );

  return (
    <Drawer.Navigator
      screenOptions={screenOptions}
      drawerContent={(props) => <CustomDrawer {...props} />}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="Mood" component={MoodScreen} />
    </Drawer.Navigator>
  );
}