import React from 'react'
import PropTypes from 'prop-types'

import warning from './utils/warning'

const getDisplayName = wrappedComponent => wrappedComponent.displayName || wrappedComponent.name
const isStateless = component => !component.render && !(component.prototype && component.prototype.render)

/*
* Size Inversion Inheritence Higher Order Component
* This component is usefull when you need a transparant way for knowing the size of a sub component
* It will call the sizeChange function when the size of the sub component is first known and then everytime it changes
*/
const SizeFetcher = (SubComponent, options = { noComparison: false }) => {
  const component = SubComponent
  let ComposedComponent = component

  // Managing component without state (functional component)
  if (isStateless(ComposedComponent)) {
    if (typeof component !== 'function') {
      warning('SizeFetcher has been called with neither a React Functional or Class Component')
      return () => null
    }
    ComposedComponent = class extends React.Component {
      render() {
        return component(this.props)
      }
    }
    ComposedComponent.displayName = getDisplayName(component)
  }

  class Enhancer extends ComposedComponent {
    componentDidMount() {
      if (super.componentDidMount) super.componentDidMount()
      const { clientHeight, clientWidth, scrollHeight, scrollWidth } = this.comp

      this.privateSizeChanged(clientHeight, clientWidth, scrollHeight, scrollWidth)
      // Register an event listener on the resize so we are concious of possible size change
      window.addEventListener('resize', this.privateHandleSizeMayHaveChanged.bind(this))
    }
    componentDidUpdate() {
      if (super.componentDidUpdate) super.componentDidUpdate()

      this.privateHandleSizeMayHaveChanged()
    }
    componentWillUnmount() {
      if (super.componentWillUnmount) super.componentWillUnmount()

      window.removeEventListener('resize', this.privateHandleSizeMayHaveChanged.bind(this))
    }

    privateSizeChanged(clientHeight, clientWidth, scrollHeight, scrollWidth) {
      const { sizeChange } = this.props

      // First call of the callback, the component mounted and we need to give its size
      sizeChange({ clientHeight: clientHeight, clientWidth: clientWidth, scrollHeight: scrollHeight, scrollWidth: scrollWidth })
      // Register the dimension for future sake (comparison)
      this.privateRegisterComponentInfos()
    }
    privateHandleSizeMayHaveChanged() {
      const { clientHeight, clientWidth, scrollHeight, scrollWidth } = this.comp

      if (options.noComparison ||
        (clientWidth !== this.clientWidth || clientHeight !== this.clientHeight ||
        scrollHeight !== this.scrollHeight || scrollWidth !== this.scrollWidth)) {
        this.privateSizeChanged(clientHeight, clientWidth, scrollHeight, scrollWidth)
      }
    }
    privateRegisterComponentInfos() {
      const { clientHeight, clientWidth, scrollHeight, scrollWidth } = this.comp

      // Register the height & width so we can compare them in the future
      this.clientHeight = clientHeight
      this.clientWidth = clientWidth
      this.scrollHeight = scrollHeight
      this.scrollWidth = scrollWidth
    }

    render() {
      // Retrieve the component render tree
      const elementsTree = super.render()

      // Here thanks to II, we can add a ref without the subComponent noticing
      let newProps = { ref: comp => (this.comp = comp) }

      // Create a new component from SubComponent render with new props
      const newElementsTree = React.cloneElement(elementsTree, newProps, elementsTree.props.children)
      return newElementsTree
    }
  }
  Enhancer.displayName = `SizeFetcher(${getDisplayName(SubComponent)})`
  Enhancer.propTypes = {
    sizeChange: PropTypes.any.isRequired,
  }

  return Enhancer
}

export default SizeFetcher
