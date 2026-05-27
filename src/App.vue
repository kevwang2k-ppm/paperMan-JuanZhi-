<template>
  <router-view v-slot="{ Component }">
    <transition name="page-transition" mode="out-in">
      <keep-alive include="Home">
        <component :is="Component" />
      </keep-alive>
    </transition>
  </router-view>
</template>

<script setup lang="ts">
// App 根组件
</script>
