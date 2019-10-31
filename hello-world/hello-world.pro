TEMPLATE = app

QT = core

TARGET = hello-world

CONFIG += c++17 console
CONFIG -= app_bundle

SOURCES += \
	main.cpp

test.target = test
win32 {
	test.depends += $(DESTDIR_TARGET)
	test.commands += ./$(DESTDIR_TARGET)
} else {
	test.depends += $(TARGET)
	test.commands += ./$(TARGET)
}
QMAKE_EXTRA_TARGETS += test
