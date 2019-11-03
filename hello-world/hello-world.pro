TEMPLATE = app

QT = core

TARGET = hello-world

CONFIG += c++17 console
CONFIG -= app_bundle

SOURCES += \
	main.cpp

test.target = test
win32 {
	win32-g++:isEmpty(DESTDIR_TARGET) {
		CONFIG(release, debug|release): DESTDIR_TARGET = ./release/$${TARGET}.exe
		else:CONFIG(debug, debug|release): DESTDIR_TARGET = ./debug/$${TARGET}.exe
		else: DESTDIR_TARGET = ./$${TARGET}.exe
	}
	test.depends += $(DESTDIR_TARGET)
	test.commands += ./$(DESTDIR_TARGET)
} else {
	test.depends += $(TARGET)
	test.commands += ./$(TARGET)
}
QMAKE_EXTRA_TARGETS += test
