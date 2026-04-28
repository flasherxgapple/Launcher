#include "powerSave.h"
#include <Arduino.h>
#include <SD_MMC.h>
#include <interface.h>

/***************************************************************************************
** Function name: _setup_gpio()
** Location: main.cpp
** Description:   initial setup for the device
***************************************************************************************/
void _setup_gpio() {
#ifdef USE_SD_MMC
    SD_MMC.setPins(PIN_SD_CLK, PIN_SD_CMD, PIN_SD_D0);
#endif

    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);

    pinMode(TFT_CS, OUTPUT);
    digitalWrite(TFT_CS, HIGH);

    pinMode(TFT_DC, OUTPUT);
    digitalWrite(TFT_DC, HIGH);

    pinMode(TFT_RST, OUTPUT);
    digitalWrite(TFT_RST, HIGH);
    delay(10);
    digitalWrite(TFT_RST, LOW);
    delay(20);
    digitalWrite(TFT_RST, HIGH);
    delay(120);

    pinMode(SEL_BTN, INPUT_PULLUP);
}

/***************************************************************************************
** Function name: _post_setup_gpio()
** Location: main.cpp
** Description:   second stage gpio setup to make a few functions work
***************************************************************************************/
void _post_setup_gpio() {}

/***************************************************************************************
** Function name: getBattery()
** location: display.cpp
** Description:   Delivers the battery value from 1-100
***************************************************************************************/
int getBattery() { return 0; }

/*********************************************************************
** Function: setBrightness
** location: settings.cpp
** set brightness value
**********************************************************************/
void _setBrightness(uint8_t brightval) {
    if (brightval == 0) {
        analogWrite(TFT_BL, 0);
        return;
    }

    int bl = MINBRIGHT + round(((255 - MINBRIGHT) * brightval / 100.0));
    analogWrite(TFT_BL, bl);
}

/*********************************************************************
** Function: InputHandler
** Handles the variables PrevPress, NextPress, SelPress, AnyKeyPress and EscPress
**********************************************************************/
void InputHandler(void) {
    static unsigned long tm = 0;
    constexpr unsigned long kInputDebounceMs = 75;
    if (millis() - tm < kInputDebounceMs && !LongPress) return;

    checkPowerSaveTime();

    static bool buttonWasDown = false;
    static unsigned long buttonDownAt = 0;
    constexpr unsigned long kSelectPressMs = 550;
    constexpr unsigned long kBackPressMs = 1200;

    PrevPress = false;
    NextPress = false;
    SelPress = false;
    EscPress = false;
    AnyKeyPress = false;

    bool buttonDown = (digitalRead(SEL_BTN) == BTN_ACT);

    if (buttonDown && !buttonWasDown) {
        buttonWasDown = true;
        buttonDownAt = millis();
        tm = millis();
        AnyKeyPress = true;
        LongPress = false;
        if (wakeUpScreen()) return;
    }

    if (buttonDown) {
        tm = millis();
        AnyKeyPress = true;
        if (millis() - buttonDownAt >= kSelectPressMs) {
            LongPress = true;
        }
        return;
    }

    if (buttonWasDown) {
        buttonWasDown = false;
        unsigned long heldMs = millis() - buttonDownAt;
        if (heldMs >= kBackPressMs) {
            EscPress = true;
        } else if (heldMs >= kSelectPressMs) {
            SelPress = true;
        } else {
            NextPress = true;
        }
        AnyKeyPress = true;
        LongPress = false;
    }
}
